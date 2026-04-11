<template>
  <div class="trading-bot" :class="{ 'theme-dark': isDarkTheme }">
    <!-- View: 详情 -->
    <template v-if="viewMode === 'detail' && selectedBot">
      <div class="detail-back">
        <a-button type="link" @click="viewMode = 'list'; selectedBot = null">
          <a-icon type="arrow-left" /> {{ $t('trading-bot.backToList') }}
        </a-button>
      </div>
      <bot-detail
        :bot="selectedBot"
        :isDark="isDarkTheme"
        :actionLoading="actionLoading"
        @start="handleStartBot"
        @stop="handleStopBot"
        @edit="handleEditBot"
        @delete="handleDeleteBot"
        @close="viewMode = 'list'; selectedBot = null"
      />
    </template>

    <!-- View: 主列表（默认视图） -->
    <template v-else>
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-title"><a-icon type="robot" class="title-icon" /> {{ $t('trading-bot.pageTitle') }}</h2>
          <p class="page-subtitle">{{ $t('trading-bot.pageSubtitle') }}</p>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-row">
        <div v-for="kpi in kpiCards" :key="kpi.label" class="kpi-card">
          <div class="kpi-icon" :style="{ color: kpi.color, background: kpi.color + '15' }">
            <a-icon :type="kpi.icon" />
          </div>
          <div class="kpi-body">
            <div class="kpi-label">{{ kpi.label }}</div>
            <div class="kpi-value">{{ kpi.value }}</div>
          </div>
        </div>
      </div>

      <!-- Bot type selection cards -->
      <bot-type-cards
        @select="handleSelectBotType"
        @ai-create="showAiDialog = true"
      />

      <!-- AI 智能创建弹窗 -->
      <ai-bot-dialog
        :visible="showAiDialog"
        :isDark="isDarkTheme"
        @close="showAiDialog = false"
        @apply="handleAiApply"
      />

      <!-- Bot list -->
      <div style="margin-top: 24px;">
        <bot-list
          :bots="bots"
          :loading="loading"
          :selectedId="selectedBot ? selectedBot.id : null"
          :actionLoadingId="actionLoadingId"
          @select="handleViewDetail"
          @start="handleStartBot"
          @stop="handleStopBot"
          @edit="handleEditBot"
          @delete="handleDeleteBot"
        />
      </div>
    </template>

    <!-- 创建/编辑向导弹窗 -->
    <a-modal
      :visible="wizardVisible"
      :title="null"
      :footer="null"
      :width="680"
      :bodyStyle="{ padding: 0 }"
      :maskClosable="false"
      :wrapClassName="isDarkTheme ? 'wizard-modal-dark' : 'wizard-modal'"
      :destroyOnClose="true"
      centered
      @cancel="handleWizardCancel"
    >
      <bot-create-wizard
        v-if="wizardVisible"
        :key="editingBot ? ('edit-' + editingBot.id) : ('create-' + selectedBotType)"
        :botType="editingBot ? (editingBot.bot_type || 'grid') : selectedBotType"
        :aiPreset="aiPreset"
        :editBot="editingBot"
        :isModal="true"
        @cancel="handleWizardCancel"
        @created="handleBotCreated"
        @updated="handleBotUpdated"
      />
    </a-modal>
  </div>
</template>

<script>
import { baseMixin } from '@/store/app-mixin'
import { getStrategyList, startStrategy, stopStrategy, deleteStrategy } from '@/api/strategy'
import { getUserInfo } from '@/api/login'
import BotTypeCards from './components/BotTypeCards.vue'
import BotCreateWizard from './components/BotCreateWizard.vue'
import BotList from './components/BotList.vue'
import BotDetail from './components/BotDetail.vue'
import AiBotDialog from './components/AiBotDialog.vue'

export default {
  name: 'TradingBot',
  mixins: [baseMixin],
  components: { BotTypeCards, BotCreateWizard, BotList, BotDetail, AiBotDialog },
  data () {
    return {
      userId: null,
      loading: false,
      bots: [],
      viewMode: 'list',
      selectedBotType: null,
      selectedBot: null,
      actionLoading: false,
      actionLoadingId: null,
      showAiDialog: false,
      aiPreset: null,
      editingBot: null
    }
  },
  computed: {
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    wizardVisible () {
      return this.viewMode === 'create' || this.viewMode === 'edit'
    },
    kpiCards () {
      const list = this.bots || []
      const running = list.filter(s => s.status === 'running').length
      const total = list.length
      let totalEquity = 0
      let totalPnl = 0
      list.forEach(s => {
        totalEquity += (s.trading_config?.initial_capital) || 0
        totalPnl += s.unrealized_pnl || 0
      })
      return [
        {
          label: this.$t('trading-bot.kpi.totalEquity'),
          value: '$' + totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2 }),
          icon: 'wallet',
          color: '#1890ff'
        },
        {
          label: this.$t('trading-bot.kpi.totalPnl'),
          value: (totalPnl >= 0 ? '+' : '') + '$' + totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2 }),
          icon: 'rise',
          color: totalPnl >= 0 ? '#52c41a' : '#f5222d'
        },
        {
          label: this.$t('trading-bot.kpi.running'),
          value: `${running} / ${total}`,
          icon: 'robot',
          color: '#722ed1'
        },
        {
          label: this.$t('trading-bot.kpi.stopped'),
          value: String(total - running),
          icon: 'pause-circle',
          color: '#faad14'
        }
      ]
    }
  },
  async created () {
    try {
      const res = await getUserInfo()
      this.userId = res?.data?.id || res?.data?.user_id || 1
    } catch {
      this.userId = 1
    }
    this.loadBots()
    const q = this.$route.query
    if (q.strategy_id) {
      this.$nextTick(() => {
        const found = this.bots.find(b => b.id === Number(q.strategy_id))
        if (found) {
          this.selectedBot = found
          this.viewMode = 'detail'
        }
      })
    }
  },
  methods: {
    async loadBots () {
      this.loading = true
      try {
        const res = await getStrategyList()
        const all = Array.isArray(res?.data?.strategies) ? res.data.strategies : []
        this.bots = all
          .filter(s => s.strategy_mode === 'bot' || s.bot_type || (s.trading_config && s.trading_config.bot_type))
          .map(s => ({
            ...s,
            bot_type: s.bot_type || (s.trading_config && s.trading_config.bot_type) || ''
          }))
        if (this.selectedBot) {
          const updated = this.bots.find(b => b.id === this.selectedBot.id)
          if (updated) this.selectedBot = updated
        }
        const q = this.$route.query
        if (q.strategy_id && !this.selectedBot) {
          const found = this.bots.find(b => b.id === Number(q.strategy_id))
          if (found) {
            this.selectedBot = found
            this.viewMode = 'detail'
          }
        }
      } catch {
        this.bots = []
      } finally {
        this.loading = false
      }
    },
    handleSelectBotType (type) {
      this.selectedBotType = type
      this.aiPreset = null
      this.editingBot = null
      this.viewMode = 'create'
    },
    handleAiApply (recommendation) {
      this.showAiDialog = false
      this.selectedBotType = recommendation.botType || 'grid'
      this.aiPreset = recommendation
      this.editingBot = null
      this.viewMode = 'create'
    },
    handleBotCreated () {
      this.viewMode = 'list'
      this.selectedBotType = null
      this.editingBot = null
      this.loadBots()
    },
    handleBotUpdated () {
      this.viewMode = 'list'
      this.editingBot = null
      this.selectedBotType = null
      this.loadBots()
    },
    handleEditBot (item) {
      if (item.status === 'running') {
        this.$message.warning(this.$t('trading-bot.msg.stopFirst'))
        return
      }
      this.editingBot = item
      this.aiPreset = null
      this.viewMode = 'edit'
    },
    handleWizardCancel () {
      this.viewMode = 'list'
      this.editingBot = null
      this.selectedBotType = null
      this.aiPreset = null
    },
    handleViewDetail (item) {
      this.selectedBot = item
      this.viewMode = 'detail'
    },
    async handleStartBot (item) {
      this.actionLoading = true
      this.actionLoadingId = item.id
      try {
        await startStrategy(item.id)
        this.$message.success(this.$t('trading-bot.msg.started'))
        this.loadBots()
      } catch (e) {
        this.$message.error(e.message || this.$t('trading-bot.msg.startFail'))
      } finally {
        this.actionLoading = false
        this.actionLoadingId = null
      }
    },
    async handleStopBot (item) {
      this.$confirm({
        title: this.$t('trading-bot.msg.stopTitle'),
        content: this.$t('trading-bot.msg.stopContent', { name: item.strategy_name }),
        okType: 'danger',
        onOk: async () => {
          this.actionLoading = true
          this.actionLoadingId = item.id
          try {
            await stopStrategy(item.id)
            this.$message.success(this.$t('trading-bot.msg.stopped'))
            this.loadBots()
          } catch (e) {
            this.$message.error(e.message || this.$t('trading-bot.msg.stopFail'))
          } finally {
            this.actionLoading = false
            this.actionLoadingId = null
          }
        }
      })
    },
    handleDeleteBot (item) {
      if (item.status === 'running') {
        this.$message.warning(this.$t('trading-bot.msg.stopFirst'))
        return
      }
      this.$confirm({
        title: this.$t('trading-bot.msg.deleteTitle'),
        content: this.$t('trading-bot.msg.deleteContent', { name: item.strategy_name }),
        okType: 'danger',
        onOk: async () => {
          await deleteStrategy(item.id)
          this.$message.success(this.$t('trading-bot.msg.deleted'))
          if (this.selectedBot?.id === item.id) {
            this.selectedBot = null
            this.viewMode = 'list'
          }
          this.loadBots()
        }
      })
    }
  }
}
</script>

<style lang="less" scoped>
.trading-bot {
  padding: 20px;
  min-height: calc(100vh - 120px);
}

.page-header {
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;

  .page-title {
    font-size: 22px;
    font-weight: 700;
    margin: 0 0 2px;
    background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    display: flex;
    align-items: center;
    gap: 10px;

    .title-icon {
      font-size: 24px;
      -webkit-text-fill-color: #1890ff;
    }
  }

  .page-subtitle {
    margin: 0;
    font-size: 13px;
    color: #8c8c8c;
  }
}

.detail-back {
  margin-bottom: 12px;

  .ant-btn-link {
    padding: 0;
    font-size: 14px;
    color: #8c8c8c;

    &:hover { color: #1890ff; }
  }
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.kpi-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
}

.kpi-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.kpi-label {
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.kpi-value {
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #262626;
}

@media (max-width: 768px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 480px) {
  .kpi-row { grid-template-columns: 1fr; }
}

// Dark theme
.trading-bot.theme-dark {
  background: #141414;

  .page-header {
    .page-title {
      background: linear-gradient(135deg, #e0e6ed 0%, #c5ccd6 100%);
      -webkit-background-clip: text;
    }

    .page-subtitle { color: rgba(255, 255, 255, 0.45); }

    .title-icon {
      color: #40a9ff !important;
      -webkit-text-fill-color: #40a9ff;
    }
  }

  .kpi-card {
    background: #1f1f1f;
    border-color: #303030;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .kpi-value { color: rgba(255, 255, 255, 0.85); }
  .kpi-label { color: rgba(255, 255, 255, 0.45); }

  .detail-back .ant-btn-link { color: rgba(255, 255, 255, 0.45); }

  // BotTypeCards
  /deep/ .section-header h3 { color: rgba(255, 255, 255, 0.85); }
  /deep/ .section-header .section-desc { color: rgba(255, 255, 255, 0.45); }

  /deep/ .type-card:not(.ai-card) {
    background: #1f1f1f;
    border-color: #303030;

    &:hover {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      border-color: #434343;
    }

    .card-name { color: rgba(255, 255, 255, 0.85); }
    .card-desc { color: rgba(255, 255, 255, 0.45); }
    .card-arrow { color: rgba(255, 255, 255, 0.25); }
  }

  // BotList
  /deep/ .list-header h3 {
    color: rgba(255, 255, 255, 0.85);

    .count { color: rgba(255, 255, 255, 0.45); }
  }

  /deep/ .bot-row {
    background: #1f1f1f;
    border-color: #303030;

    &:hover {
      border-color: #434343;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }

    &.active {
      background: rgba(23, 125, 220, 0.12);
      border-color: rgba(23, 125, 220, 0.3);
    }

    .bot-name { color: rgba(255, 255, 255, 0.85); }
    .meta-text { color: rgba(255, 255, 255, 0.45); }
  }

  /deep/ .bot-status-badge .text { color: rgba(255, 255, 255, 0.45); }
  /deep/ .empty-state { color: rgba(255, 255, 255, 0.45); }

  // BotDetail
  /deep/ .detail-header-card,
  /deep/ .detail-tabs-card {
    background: #1f1f1f;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);

    .ant-card-body { background: #1f1f1f; }
  }

  /deep/ .detail-header .header-info h3 { color: rgba(255, 255, 255, 0.85); }

  // Ant Tabs
  /deep/ .ant-tabs-bar { border-bottom-color: #303030; }
  /deep/ .ant-tabs-tab { color: rgba(255, 255, 255, 0.65); }
  /deep/ .ant-tabs-tab-active { color: #177ddc !important; }
  /deep/ .ant-tabs-ink-bar { background: #177ddc; }
  /deep/ .ant-card-head { border-bottom-color: #303030; background: transparent; }
  /deep/ .ant-card-head-title { color: rgba(255, 255, 255, 0.85); }

  // AI Banner (stays inside page so /deep/ works)
  /deep/ .ai-create-banner {
    border: 1px solid rgba(102, 126, 234, 0.3);

    &:hover {
      box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
    }
  }

  /deep/ .ai-reason-bar {
    background: rgba(102, 126, 234, 0.1);
    border-color: rgba(102, 126, 234, 0.2);
    color: rgba(255, 255, 255, 0.65);
  }

  // BotCreateWizard
  /deep/ .wizard-title { color: rgba(255, 255, 255, 0.85) !important; }
  /deep/ .back-btn { color: rgba(255, 255, 255, 0.45) !important; }

  /deep/ .step-hint {
    background: rgba(23, 125, 220, 0.1);
    color: rgba(255, 255, 255, 0.65);
  }

  /deep/ .form-hint {
    color: rgba(255, 255, 255, 0.45);
    a { color: #177ddc; }
  }

  /deep/ .confirm-section h4 { color: rgba(255, 255, 255, 0.85); }
  /deep/ .wizard-footer { border-top-color: #303030; }

  /deep/ .config-summary {
    .label { color: rgba(255, 255, 255, 0.45); }
    .value { color: rgba(255, 255, 255, 0.85); }
  }

  /deep/ .dip-buy-hint { color: rgba(255, 255, 255, 0.45); }

  // Ant Steps
  /deep/ .ant-steps-item-title { color: rgba(255, 255, 255, 0.65) !important; }
  /deep/ .ant-steps-item-finish .ant-steps-item-title { color: rgba(255, 255, 255, 0.85) !important; }
  /deep/ .ant-steps-item-process .ant-steps-item-title { color: rgba(255, 255, 255, 0.85) !important; }
  /deep/ .ant-steps-item-tail::after { background: #303030 !important; }
  /deep/ .ant-steps-item-finish .ant-steps-item-tail::after { background: #177ddc !important; }

  // Ant Form
  /deep/ .ant-form-item-label > label { color: rgba(255, 255, 255, 0.85); }
  /deep/ .ant-form-item-label label { color: rgba(255, 255, 255, 0.85); }

  // Ant Input / Select / InputNumber
  /deep/ .ant-input,
  /deep/ .ant-input-number,
  /deep/ .ant-select-selection,
  /deep/ .ant-input-number-input {
    background: #1f1f1f !important;
    border-color: #434343 !important;
    color: rgba(255, 255, 255, 0.85) !important;
  }

  /deep/ .ant-input::placeholder,
  /deep/ .ant-input-number-input::placeholder {
    color: rgba(255, 255, 255, 0.3) !important;
  }

  /deep/ .ant-select-selection__placeholder,
  /deep/ .ant-select-search__field__placeholder {
    color: rgba(255, 255, 255, 0.3) !important;
  }

  /deep/ .ant-select-arrow { color: rgba(255, 255, 255, 0.45); }
  /deep/ .ant-select-selection-selected-value { color: rgba(255, 255, 255, 0.85) !important; }
  /deep/ .ant-input-number-handler-wrap { background: #1f1f1f; border-color: #434343; }
  /deep/ .ant-input-number-handler { color: rgba(255, 255, 255, 0.45); border-color: #434343; }

  // Ant Radio
  /deep/ .ant-radio-wrapper { color: rgba(255, 255, 255, 0.85); }
  /deep/ .ant-radio-inner { background: #1f1f1f; border-color: #434343; }

  // Ant Slider
  /deep/ .ant-slider-rail { background: #434343; }
  /deep/ .ant-slider-track { background: #177ddc; }

  // Ant Switch
  /deep/ .ant-switch { background: #434343; }

  // Ant Descriptions
  /deep/ .ant-descriptions-bordered .ant-descriptions-item-label {
    background: #1a1a1a;
    color: rgba(255, 255, 255, 0.65);
    border-color: #303030;
  }

  /deep/ .ant-descriptions-bordered .ant-descriptions-item-content {
    background: #1f1f1f;
    color: rgba(255, 255, 255, 0.85);
    border-color: #303030;
  }

  /deep/ .ant-descriptions-bordered .ant-descriptions-view {
    border-color: #303030;
  }

  // Ant Empty
  /deep/ .ant-empty-description { color: rgba(255, 255, 255, 0.45); }
  /deep/ .ant-empty-image svg { fill: rgba(255, 255, 255, 0.15); }

  // Ant Alert
  /deep/ .ant-alert-warning {
    background: rgba(250, 173, 20, 0.08);
    border-color: rgba(250, 173, 20, 0.2);
  }

  /deep/ .ant-alert-message { color: rgba(255, 255, 255, 0.85); }
  /deep/ .ant-alert-description { color: rgba(255, 255, 255, 0.65); }

  // Ant Input search
  /deep/ .ant-input-search .ant-input-suffix { color: rgba(255, 255, 255, 0.45); }

  // Ant autocomplete dropdown handled by global theme
}
</style>

<style lang="less">
.wizard-modal,
.wizard-modal-dark {
  .ant-modal-content {
    border-radius: 16px;
    overflow: hidden;
  }

  .ant-modal-body {
    padding: 0;
  }

  .ant-modal-close-x {
    width: 48px;
    height: 48px;
    line-height: 48px;
    font-size: 16px;
  }
}

.wizard-modal-dark {
  .ant-modal-content {
    background: #1f1f1f;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
  }

  .ant-modal-close-x {
    color: rgba(255, 255, 255, 0.45);
  }

  .wizard-title { color: rgba(255, 255, 255, 0.85) !important; }

  .step-hint {
    background: rgba(23, 125, 220, 0.1);
    color: rgba(255, 255, 255, 0.65);
  }

  .form-hint {
    color: rgba(255, 255, 255, 0.45);
    a { color: #177ddc; }
  }

  .confirm-section h4 { color: rgba(255, 255, 255, 0.85); }
  .wizard-footer { border-top-color: #303030; }

  .config-summary {
    .label { color: rgba(255, 255, 255, 0.45); }
    .value { color: rgba(255, 255, 255, 0.85); }
  }

  .direction-hint,
  .capital-hint,
  .dip-buy-hint { color: rgba(255, 255, 255, 0.45) !important; }

  .ai-reason-bar {
    background: rgba(102, 126, 234, 0.1);
    border-color: rgba(102, 126, 234, 0.2);
    color: rgba(255, 255, 255, 0.65);
  }

  .ant-steps-item-title { color: rgba(255, 255, 255, 0.65) !important; }
  .ant-steps-item-finish .ant-steps-item-title { color: rgba(255, 255, 255, 0.85) !important; }
  .ant-steps-item-process .ant-steps-item-title { color: rgba(255, 255, 255, 0.85) !important; }
  .ant-steps-item-tail::after { background: #303030 !important; }
  .ant-steps-item-finish .ant-steps-item-tail::after { background: #177ddc !important; }

  .ant-form-item-label > label,
  .ant-form-item-label label { color: rgba(255, 255, 255, 0.85); }

  .ant-input,
  .ant-input-number,
  .ant-select-selection,
  .ant-input-number-input {
    background: #1f1f1f !important;
    border-color: #434343 !important;
    color: rgba(255, 255, 255, 0.85) !important;
  }

  .ant-input::placeholder,
  .ant-input-number-input::placeholder { color: rgba(255, 255, 255, 0.3) !important; }

  .ant-select-selection__placeholder,
  .ant-select-search__field__placeholder { color: rgba(255, 255, 255, 0.3) !important; }

  .ant-select-arrow { color: rgba(255, 255, 255, 0.45); }
  .ant-select-selection-selected-value { color: rgba(255, 255, 255, 0.85) !important; }
  .ant-input-number-handler-wrap { background: #1f1f1f; border-color: #434343; }
  .ant-input-number-handler { color: rgba(255, 255, 255, 0.45); border-color: #434343; }

  .ant-radio-wrapper { color: rgba(255, 255, 255, 0.85); }
  .ant-radio-inner { background: #1f1f1f; border-color: #434343; }

  .ant-slider-rail { background: #434343; }
  .ant-slider-track { background: #177ddc; }

  .ant-switch { background: #434343; }

  .ant-descriptions-bordered .ant-descriptions-item-label {
    background: #1a1a1a;
    color: rgba(255, 255, 255, 0.65);
    border-color: #303030;
  }

  .ant-descriptions-bordered .ant-descriptions-item-content {
    background: #1f1f1f;
    color: rgba(255, 255, 255, 0.85);
    border-color: #303030;
  }

  .ant-descriptions-bordered .ant-descriptions-view { border-color: #303030; }

  .ant-alert-warning {
    background: rgba(250, 173, 20, 0.08);
    border-color: rgba(250, 173, 20, 0.2);
  }

  .ant-alert-message { color: rgba(255, 255, 255, 0.85); }
  .ant-alert-description { color: rgba(255, 255, 255, 0.65); }
}
</style>

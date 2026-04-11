<template>
  <div class="bot-detail" v-if="bot">
    <a-card :bordered="false" class="detail-header-card">
      <div class="detail-header">
        <div class="header-left">
          <div class="type-icon" :style="{ background: botGradient }">
            <a-icon :type="botIcon" />
          </div>
          <div class="header-info">
            <h3>{{ bot.strategy_name }}</h3>
            <div class="header-tags">
              <a-tag :color="bot.status === 'running' ? 'green' : bot.status === 'error' ? 'red' : 'default'">
                {{ statusText }}
              </a-tag>
              <a-tag v-if="bot.bot_type" color="purple">{{ botTypeName }}</a-tag>
              <a-tag v-if="bot.trading_config && bot.trading_config.symbol" color="blue">
                {{ bot.trading_config.symbol }}
              </a-tag>
              <a-tag v-if="bot.exchange_config && bot.exchange_config.exchange_id">
                {{ exchangeName }}
              </a-tag>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <a-button
            v-if="bot.status !== 'running'"
            type="primary"
            :loading="actionLoading"
            @click="$emit('start', bot)"
          >
            <a-icon type="play-circle" /> {{ $t('trading-bot.action.start') }}
          </a-button>
          <a-button
            v-else
            type="danger"
            :loading="actionLoading"
            @click="$emit('stop', bot)"
          >
            <a-icon type="pause-circle" /> {{ $t('trading-bot.action.stop') }}
          </a-button>
          <a-button
            @click="$emit('edit', bot)"
            :disabled="bot.status === 'running'"
          >
            <a-icon type="edit" /> {{ $t('trading-bot.action.edit') }}
          </a-button>
          <a-button
            type="danger"
            ghost
            @click="$emit('delete', bot)"
            :disabled="bot.status === 'running'"
          >
            <a-icon type="delete" />
          </a-button>
          <a-button @click="$emit('close')">
            <a-icon type="close" />
          </a-button>
        </div>
      </div>
    </a-card>

    <a-card :bordered="false" class="detail-tabs-card" style="margin-top: 12px;">
      <a-tabs v-model="activeTab" :animated="false">
        <a-tab-pane key="positions" :tab="$t('trading-bot.tab.positions')">
          <position-records
            v-if="activeTab === 'positions'"
            :strategyId="bot.id"
            :isDark="isDark"
          />
        </a-tab-pane>
        <a-tab-pane key="trades" :tab="$t('trading-bot.tab.trades')">
          <trading-records
            v-if="activeTab === 'trades'"
            :strategyId="bot.id"
            :isDark="isDark"
          />
        </a-tab-pane>
        <a-tab-pane key="performance" :tab="$t('trading-bot.tab.performance')">
          <performance-analysis
            v-if="activeTab === 'performance'"
            :strategyId="bot.id"
            :isDark="isDark"
          />
        </a-tab-pane>
        <a-tab-pane key="logs" :tab="$t('trading-bot.tab.logs')">
          <strategy-logs
            v-if="activeTab === 'logs'"
            :strategyId="bot.id"
            :isDark="isDark"
          />
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<script>
import TradingRecords from '@/views/trading-assistant/components/TradingRecords.vue'
import PositionRecords from '@/views/trading-assistant/components/PositionRecords.vue'
import PerformanceAnalysis from '@/views/trading-assistant/components/PerformanceAnalysis.vue'
import StrategyLogs from '@/views/trading-assistant/components/StrategyLogs.vue'

const TYPE_META = {
  grid: { icon: 'bar-chart', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  martingale: { icon: 'fall', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  trend: { icon: 'stock', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  dca: { icon: 'fund', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  arbitrage: { icon: 'swap', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  custom: { icon: 'code', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' }
}

export default {
  name: 'BotDetail',
  components: { TradingRecords, PositionRecords, PerformanceAnalysis, StrategyLogs },
  props: {
    bot: { type: Object, default: null },
    isDark: { type: Boolean, default: false },
    actionLoading: { type: Boolean, default: false }
  },
  data () {
    return {
      activeTab: 'positions'
    }
  },
  computed: {
    botIcon () {
      return (TYPE_META[this.bot?.bot_type] || TYPE_META.custom).icon
    },
    botGradient () {
      return (TYPE_META[this.bot?.bot_type] || TYPE_META.custom).gradient
    },
    botTypeName () {
      return this.$t(`trading-bot.type.${this.bot?.bot_type}`) || this.bot?.bot_type
    },
    statusText () {
      const map = {
        running: this.$t('trading-bot.status.running'),
        stopped: this.$t('trading-bot.status.stopped'),
        error: this.$t('trading-bot.status.error')
      }
      return map[this.bot?.status] || this.$t('trading-bot.status.stopped')
    },
    exchangeName () {
      const id = this.bot?.exchange_config?.exchange_id
      return { binance: 'Binance', bybit: 'Bybit', gate: 'Gate.io', okx: 'OKX' }[id] || id
    }
  },
  watch: {
    bot () {
      this.activeTab = 'positions'
    }
  }
}
</script>

<style lang="less" scoped>
.detail-header-card,
.detail-tabs-card {
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
  }

  .type-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 22px;
    flex-shrink: 0;
  }

  .header-info {
    h3 {
      font-size: 18px;
      font-weight: 700;
      margin: 0 0 6px;
      color: #262626;
    }
  }

  .header-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .header-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
}
</style>

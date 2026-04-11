<template>
  <div class="bot-create-wizard" :class="{ 'is-modal': isModal }">
    <div class="wizard-header">
      <h3 class="wizard-title">
        <span class="type-badge" :style="{ background: typeInfo.gradient }">
          <a-icon :type="typeInfo.icon" />
        </span>
        {{ isEditMode ? $t('trading-bot.wizard.editTitle', { type: typeInfo.name }) : $t('trading-bot.wizard.createTitle', { type: typeInfo.name }) }}
        <span v-if="aiPreset" class="ai-badge">
          <a-icon type="thunderbolt" /> AI
        </span>
      </h3>
      <div v-if="aiPreset && aiPreset.reason" class="ai-reason-bar">
        <a-icon type="bulb" />
        {{ aiPreset.reason }}
      </div>
    </div>

    <a-steps :current="currentStep" class="wizard-steps" size="small">
      <a-step :title="$t('trading-bot.wizard.step1')" />
      <a-step :title="$t('trading-bot.wizard.step2')" />
      <a-step :title="$t('trading-bot.wizard.step3')" />
      <a-step :title="$t('trading-bot.wizard.step4')" />
    </a-steps>

    <div class="wizard-content">
      <!-- Step 1: 基础配置 -->
      <div v-show="currentStep === 0" class="step-panel">
        <a-form-model
          ref="baseForm"
          :model="baseForm"
          :rules="baseRules"
          :label-col="{ span: 6 }"
          :wrapper-col="{ span: 16 }"
        >
          <a-form-model-item :label="$t('trading-bot.wizard.botName')" prop="botName">
            <a-input
              v-model="baseForm.botName"
              :placeholder="$t('trading-bot.wizard.botNamePh')"
            />
          </a-form-model-item>

          <a-form-model-item :label="$t('trading-bot.wizard.savedCredential')" prop="credentialId">
            <a-select
              v-model="baseForm.credentialId"
              :placeholder="$t('trading-bot.wizard.selectCredential')"
              :loading="loadingCredentials"
              allow-clear
              show-search
              option-filter-prop="children"
              @change="handleCredentialChange"
            >
              <a-select-option
                v-for="cred in credentials"
                :key="cred.id"
                :value="cred.id"
              >
                {{ cred.name || cred.exchange_id }} ({{ cred.exchange_id }}{{ cred.api_key_hint ? ' · ' + cred.api_key_hint : '' }})
              </a-select-option>
            </a-select>
            <div class="form-hint" style="margin-top: 6px;">
              <router-link to="/profile?tab=exchange">
                <a-icon type="setting" /> {{ $t('trading-bot.wizard.manageCredentials') }}
              </router-link>
            </div>
          </a-form-model-item>

          <a-form-model-item :label="$t('trading-bot.wizard.symbol')" prop="symbol">
            <a-auto-complete
              v-model="baseForm.symbol"
              :data-source="symbolSuggestions"
              :placeholder="$t('trading-bot.wizard.symbolPh')"
              :filter-option="filterSymbol"
            />
          </a-form-model-item>

          <a-form-model-item :label="$t('trading-bot.wizard.timeframe')">
            <a-select v-model="baseForm.timeframe">
              <a-select-option value="1m">1 {{ $t('trading-bot.timeframe.min') }}</a-select-option>
              <a-select-option value="5m">5 {{ $t('trading-bot.timeframe.min') }}</a-select-option>
              <a-select-option value="15m">15 {{ $t('trading-bot.timeframe.min') }}</a-select-option>
              <a-select-option value="1h">1 {{ $t('trading-bot.timeframe.hour') }}</a-select-option>
              <a-select-option value="4h">4 {{ $t('trading-bot.timeframe.hour') }}</a-select-option>
              <a-select-option value="1d">1 {{ $t('trading-bot.timeframe.day') }}</a-select-option>
            </a-select>
          </a-form-model-item>

          <a-form-model-item :label="$t('trading-bot.wizard.marketType')">
            <a-radio-group v-model="baseForm.marketType">
              <a-radio value="swap">{{ $t('trading-bot.wizard.futures') }}</a-radio>
              <a-radio value="spot">{{ $t('trading-bot.wizard.spot') }}</a-radio>
            </a-radio-group>
          </a-form-model-item>

          <a-form-model-item
            v-if="baseForm.marketType === 'swap'"
            :label="$t('trading-bot.wizard.leverage')"
          >
            <a-input-number
              v-model="baseForm.leverage"
              :min="1"
              :max="125"
              :step="1"
              style="width: 100%"
            />
          </a-form-model-item>

          <a-form-model-item :label="$t('trading-bot.wizard.initialCapital')" prop="initialCapital">
            <a-input-number
              v-model="baseForm.initialCapital"
              :min="10"
              :step="100"
              style="width: 100%"
              placeholder="USDT"
            />
          </a-form-model-item>

        </a-form-model>
      </div>

      <!-- Step 2: 策略参数 -->
      <div v-show="currentStep === 1" class="step-panel">
        <div class="step-hint">
          <a-icon type="info-circle" /> {{ typeInfo.configHint }}
        </div>
        <component
          :is="configComponent"
          ref="strategyConfig"
          v-model="strategyParams"
          :initialCapital="baseForm.initialCapital"
        />
      </div>

      <!-- Step 3: 风控设置 -->
      <div v-show="currentStep === 2" class="step-panel">
        <a-form-model
          ref="riskForm"
          :model="riskForm"
          :label-col="{ span: 8 }"
          :wrapper-col="{ span: 14 }"
        >
          <a-form-model-item :label="$t('trading-bot.risk.stopLossPct')">
            <a-input-number
              v-model="riskForm.stopLossPct"
              :min="0"
              :max="100"
              :step="1"
              style="width: 100%"
              :formatter="v => `${v}%`"
              :parser="v => v.replace('%', '')"
            />
          </a-form-model-item>
          <a-form-model-item :label="$t('trading-bot.risk.takeProfitPct')">
            <a-input-number
              v-model="riskForm.takeProfitPct"
              :min="0"
              :max="1000"
              :step="1"
              style="width: 100%"
              :formatter="v => `${v}%`"
              :parser="v => v.replace('%', '')"
            />
          </a-form-model-item>
          <a-form-model-item :label="$t('trading-bot.risk.maxPosition')">
            <a-input-number
              v-model="riskForm.maxPosition"
              :min="0"
              :step="100"
              style="width: 100%"
              placeholder="USDT"
            />
          </a-form-model-item>
          <a-form-model-item :label="$t('trading-bot.risk.maxDailyLoss')">
            <a-input-number
              v-model="riskForm.maxDailyLoss"
              :min="0"
              :step="10"
              style="width: 100%"
              placeholder="USDT"
            />
          </a-form-model-item>
        </a-form-model>
      </div>

      <!-- Step 4: 确认 -->
      <div v-show="currentStep === 3" class="step-panel">
        <div class="confirm-section">
          <h4>{{ $t('trading-bot.wizard.confirmTitle') }}</h4>
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item :label="$t('trading-bot.wizard.botName')">
              {{ baseForm.botName }}
            </a-descriptions-item>
            <a-descriptions-item :label="$t('trading-bot.wizard.botType')">
              {{ typeInfo.name }}
            </a-descriptions-item>
            <a-descriptions-item :label="$t('trading-bot.wizard.savedCredential')">
              {{ selectedCredentialLabel }}
            </a-descriptions-item>
            <a-descriptions-item :label="$t('trading-bot.wizard.symbol')">
              {{ baseForm.symbol }}
            </a-descriptions-item>
            <a-descriptions-item :label="$t('trading-bot.wizard.timeframe')">
              {{ baseForm.timeframe }}
            </a-descriptions-item>
            <a-descriptions-item :label="$t('trading-bot.wizard.marketType')">
              {{ baseForm.marketType === 'swap' ? $t('trading-bot.wizard.futures') : $t('trading-bot.wizard.spot') }}
            </a-descriptions-item>
            <a-descriptions-item
              v-if="baseForm.marketType === 'swap'"
              :label="$t('trading-bot.wizard.leverage')"
            >
              {{ baseForm.leverage }}x
            </a-descriptions-item>
            <a-descriptions-item :label="$t('trading-bot.wizard.initialCapital')">
              ${{ baseForm.initialCapital }}
            </a-descriptions-item>
          </a-descriptions>

          <h4 style="margin-top: 20px;">{{ $t('trading-bot.wizard.strategyParams') }}</h4>
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item
              v-for="(val, key) in strategyParams"
              :key="key"
              :label="key"
            >
              {{ val }}
            </a-descriptions-item>
          </a-descriptions>

          <h4 style="margin-top: 20px;">{{ $t('trading-bot.wizard.riskParams') }}</h4>
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item :label="$t('trading-bot.risk.stopLossPct')">
              {{ riskForm.stopLossPct }}%
            </a-descriptions-item>
            <a-descriptions-item :label="$t('trading-bot.risk.takeProfitPct')">
              {{ riskForm.takeProfitPct }}%
            </a-descriptions-item>
            <a-descriptions-item :label="$t('trading-bot.risk.maxPosition')">
              ${{ riskForm.maxPosition }}
            </a-descriptions-item>
          </a-descriptions>

          <a-alert
            type="warning"
            show-icon
            style="margin-top: 16px;"
            :message="$t('trading-bot.wizard.liveWarning')"
            :description="$t('trading-bot.wizard.liveWarningDesc')"
          />
        </div>
      </div>
    </div>

    <div class="wizard-footer">
      <a-button v-if="currentStep > 0" @click="prevStep">
        <a-icon type="left" /> {{ $t('trading-bot.wizard.prev') }}
      </a-button>
      <div class="spacer"></div>
      <a-button
        v-if="currentStep < 3"
        type="primary"
        @click="nextStep"
      >
        {{ $t('trading-bot.wizard.next') }} <a-icon type="right" />
      </a-button>
      <a-button
        v-else
        type="primary"
        :loading="creating"
        @click="handleSubmit"
      >
        <a-icon :type="isEditMode ? 'save' : 'rocket'" />
        {{ isEditMode ? $t('trading-bot.wizard.save') : $t('trading-bot.wizard.create') }}
      </a-button>
    </div>
  </div>
</template>

<script>
import { createStrategy, updateStrategy } from '@/api/strategy'
import { listExchangeCredentials } from '@/api/credentials'
import { generateBotScript } from './botScriptTemplates'
import GridConfig from './configs/GridConfig.vue'
import MartingaleConfig from './configs/MartingaleConfig.vue'
import TrendConfig from './configs/TrendConfig.vue'
import DCAConfig from './configs/DCAConfig.vue'

const BOT_TYPE_MAP = {
  grid: {
    icon: 'bar-chart',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    component: 'GridConfig'
  },
  martingale: {
    icon: 'fall',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    component: 'MartingaleConfig'
  },
  trend: {
    icon: 'stock',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    component: 'TrendConfig'
  },
  dca: {
    icon: 'fund',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    component: 'DCAConfig'
  }
}

export default {
  name: 'BotCreateWizard',
  components: { GridConfig, MartingaleConfig, TrendConfig, DCAConfig },
  props: {
    botType: { type: String, required: true },
    aiPreset: { type: Object, default: null },
    editBot: { type: Object, default: null },
    isModal: { type: Boolean, default: false }
  },
  data () {
    return {
      currentStep: 0,
      creating: false,
      loadingCredentials: false,
      credentials: [],
      currentExchangeId: '',
      baseForm: {
        botName: '',
        credentialId: undefined,
        symbol: '',
        timeframe: '1h',
        marketType: 'swap',
        leverage: 5,
        initialCapital: null
      },
      baseRules: {
        botName: [{ required: true, message: this.$t('trading-bot.wizard.botNameReq'), trigger: 'blur' }],
        credentialId: [{ required: true, message: this.$t('trading-bot.wizard.credentialReq'), trigger: 'change' }],
        symbol: [{ required: true, message: this.$t('trading-bot.wizard.symbolReq'), trigger: 'blur' }],
        initialCapital: [{ required: true, type: 'number', min: 10, message: this.$t('trading-bot.wizard.capitalReq'), trigger: 'change' }]
      },
      strategyParams: {},
      riskForm: {
        stopLossPct: 10,
        takeProfitPct: 20,
        maxPosition: 5000,
        maxDailyLoss: 500
      },
      symbolSuggestions: [
        'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT',
        'DOGE/USDT', 'ADA/USDT', 'AVAX/USDT', 'DOT/USDT', 'MATIC/USDT',
        'LINK/USDT', 'UNI/USDT', 'ATOM/USDT', 'LTC/USDT', 'FIL/USDT'
      ]
    }
  },
  computed: {
    isEditMode () {
      return !!this.editBot
    },
    typeInfo () {
      const meta = BOT_TYPE_MAP[this.botType] || BOT_TYPE_MAP.grid
      return {
        ...meta,
        name: this.$t(`trading-bot.type.${this.botType}`),
        configHint: this.$t(`trading-bot.type.${this.botType}Hint`)
      }
    },
    configComponent () {
      const meta = BOT_TYPE_MAP[this.botType]
      return meta ? meta.component : 'GridConfig'
    },
    selectedCredentialLabel () {
      if (!this.baseForm.credentialId) return '-'
      const cred = this.credentials.find(c => c.id === this.baseForm.credentialId)
      if (!cred) return '-'
      return `${cred.name || cred.exchange_id} (${cred.exchange_id})`
    }
  },
  watch: {
    'baseForm.initialCapital' (val) {
      if (!val || val <= 0) return
      this.riskForm.maxPosition = val
      this.riskForm.maxDailyLoss = Math.round(val * 0.1)
    }
  },
  created () {
    this.loadCredentials()
    if (this.editBot) {
      this.applyEditBot()
    } else {
      this.applyAiPreset()
    }
  },
  methods: {
    applyEditBot () {
      const bot = this.editBot
      if (!bot) return
      this.baseForm.botName = bot.strategy_name || ''
      const tc = bot.trading_config || {}
      this.baseForm.symbol = tc.symbol || ''
      this.baseForm.timeframe = tc.timeframe || '1h'
      this.baseForm.marketType = tc.market_type || 'swap'
      this.baseForm.leverage = tc.leverage || 5
      this.baseForm.initialCapital = tc.initial_capital || 1000
      this.baseForm.credentialId = bot.exchange_config?.credential_id || undefined
      this.currentExchangeId = (bot.exchange_config?.exchange_id || '').toLowerCase()
      if (tc.bot_params && typeof tc.bot_params === 'object') {
        this.strategyParams = { ...tc.bot_params }
      }
      this.riskForm.stopLossPct = tc.stop_loss_pct ?? 10
      this.riskForm.takeProfitPct = tc.take_profit_pct ?? 20
      this.riskForm.maxPosition = tc.max_position ?? 5000
      this.riskForm.maxDailyLoss = tc.max_daily_loss ?? 500
    },
    applyAiPreset () {
      if (!this.aiPreset) return
      const p = this.aiPreset
      if (p.botName) this.baseForm.botName = p.botName
      const base = p.baseConfig || {}
      if (base.symbol) this.baseForm.symbol = base.symbol
      if (base.timeframe) this.baseForm.timeframe = base.timeframe
      if (base.marketType) this.baseForm.marketType = base.marketType
      if (base.leverage) this.baseForm.leverage = base.leverage
      this.baseForm.initialCapital = null
      if (p.strategyParams && typeof p.strategyParams === 'object') {
        const params = { ...p.strategyParams }
        delete params.amountPerGrid
        delete params.initialAmount
        delete params.totalBudget
        this.strategyParams = params
      }
      this.riskForm.stopLossPct = (p.riskConfig || {}).stopLossPct ?? 10
      this.riskForm.takeProfitPct = (p.riskConfig || {}).takeProfitPct ?? 20
      this.riskForm.maxPosition = null
      this.riskForm.maxDailyLoss = null
    },
    filterSymbol (input, option) {
      return option.toUpperCase().indexOf(input.toUpperCase()) >= 0
    },
    async loadCredentials () {
      this.loadingCredentials = true
      try {
        const res = await listExchangeCredentials()
        this.credentials = (res?.data?.items) || []
      } catch {
        this.credentials = []
      } finally {
        this.loadingCredentials = false
      }
    },
    handleCredentialChange (credId) {
      if (!credId) {
        this.currentExchangeId = ''
        return
      }
      const cred = this.credentials.find(c => c.id === credId)
      if (cred) {
        this.currentExchangeId = (cred.exchange_id || '').toLowerCase()
      }
    },
    async nextStep () {
      if (this.currentStep === 0) {
        try {
          await new Promise((resolve, reject) => {
            this.$refs.baseForm.validate(valid => valid ? resolve() : reject(new Error()))
          })
        } catch {
          return
        }
      }
      if (this.currentStep === 1 && this.$refs.strategyConfig) {
        try {
          await this.$refs.strategyConfig.validate()
        } catch {
          return
        }
      }
      this.currentStep++
    },
    prevStep () {
      if (this.currentStep > 0) this.currentStep--
    },
    handleSubmit () {
      if (this.isEditMode) {
        this.handleUpdate()
      } else {
        this.handleCreate()
      }
    },
    buildPayload () {
      const strategyCode = generateBotScript(this.botType, this.strategyParams, {
        timeframe: this.baseForm.timeframe
      })
      const leverage = this.baseForm.marketType === 'spot' ? 1 : (this.baseForm.leverage || 5)
      const tradeDirection = this.baseForm.marketType === 'spot' ? 'long' : 'both'

      return {
        strategy_name: this.baseForm.botName,
        strategy_type: 'ScriptStrategy',
        strategy_mode: 'bot',
        strategy_code: strategyCode,
        market_category: 'Crypto',
        execution_mode: 'live',
        exchange_config: {
          credential_id: this.baseForm.credentialId,
          exchange_id: this.currentExchangeId
        },
        trading_config: {
          symbol: this.baseForm.symbol,
          timeframe: this.baseForm.timeframe,
          market_type: this.baseForm.marketType,
          leverage: leverage,
          trade_direction: tradeDirection,
          initial_capital: this.baseForm.initialCapital,
          stop_loss_pct: this.riskForm.stopLossPct,
          take_profit_pct: this.riskForm.takeProfitPct,
          max_position: this.riskForm.maxPosition,
          max_daily_loss: this.riskForm.maxDailyLoss,
          bot_type: this.botType,
          bot_params: { ...this.strategyParams },
          order_mode: this.strategyParams.orderMode || 'maker',
          entry_trigger_mode: 'immediate'
        },
        notification_config: {
          channels: ['browser'],
          targets: {}
        },
        bot_type: this.botType
      }
    },
    async handleCreate () {
      this.creating = true
      try {
        const payload = this.buildPayload()
        await createStrategy(payload)
        this.$message.success(this.$t('trading-bot.wizard.createSuccess'))
        this.$emit('created')
      } catch (e) {
        this.$message.error(e.message || this.$t('trading-bot.wizard.createFail'))
      } finally {
        this.creating = false
      }
    },
    async handleUpdate () {
      this.creating = true
      try {
        const payload = this.buildPayload()
        await updateStrategy(this.editBot.id, payload)
        this.$message.success(this.$t('trading-bot.wizard.saveSuccess'))
        this.$emit('updated')
      } catch (e) {
        this.$message.error(e.message || this.$t('trading-bot.wizard.saveFail'))
      } finally {
        this.creating = false
      }
    }
  }
}
</script>

<style lang="less" scoped>
.bot-create-wizard {
  display: flex;
  flex-direction: column;
  height: 100%;

  &.is-modal {
    padding: 24px;
    max-height: 75vh;

    .wizard-content {
      overflow-y: auto;
      max-height: calc(75vh - 200px);
    }
  }
}

.wizard-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;

  .wizard-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    color: #262626;
  }

  .type-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    color: #fff;
    font-size: 16px;
  }
}

.ai-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  vertical-align: middle;
  letter-spacing: 0.5px;
}

.ai-reason-bar {
  margin-top: 8px;
  padding: 10px 14px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.08));
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 8px;
  font-size: 13px;
  color: #595959;
  line-height: 1.5;

  .anticon {
    color: #764ba2;
    margin-right: 6px;
  }
}

.wizard-steps {
  margin-bottom: 28px;
}

.wizard-content {
  flex: 1;
  overflow-y: auto;
  min-height: 300px;
}

.step-panel {
  max-width: 600px;
  margin: 0 auto;
}

.step-hint {
  padding: 10px 14px;
  background: rgba(24, 144, 255, 0.06);
  border-radius: 8px;
  font-size: 13px;
  color: #595959;
  margin-bottom: 20px;

  .anticon { color: #1890ff; margin-right: 6px; }
}

.form-hint {
  font-size: 12px;
  color: #8c8c8c;

  a { color: #1890ff; font-size: 12px; }
}

.confirm-section {
  h4 {
    font-size: 15px;
    font-weight: 600;
    margin: 0 0 12px;
    color: #262626;
  }
}

.wizard-footer {
  display: flex;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
  margin-top: 20px;

  .spacer { flex: 1; }
}
</style>

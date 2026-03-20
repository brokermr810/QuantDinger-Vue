<template>
  <div class="fast-analysis-report" :class="{ 'theme-dark': isDarkTheme }">
    <!-- Loading State - 专业进度条 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-content-pro">
        <div class="loading-header">
          <a-icon type="thunderbolt" class="loading-icon-pro" />
          <span class="loading-title">{{ $t('fastAnalysis.analyzing') }}</span>
        </div>

        <!-- 进度条 -->
        <div class="progress-wrapper">
          <a-progress
            :percent="progressPercent"
            :showInfo="false"
            strokeColor="#1890ff"
            :strokeWidth="8"
          />
          <span class="progress-text">{{ formatProgress(progressPercent) }}%</span>
        </div>

        <!-- 当前步骤 -->
        <div class="current-step">
          <a-icon type="loading" spin />
          <span>{{ currentStepText }}</span>
        </div>

        <!-- 步骤列表 -->
        <div class="steps-list">
          <div class="step-item" :class="{ done: step > 1, active: step === 1 }">
            <span class="step-dot"></span>
            <span class="step-text">{{ $t('fastAnalysis.step1') || '获取实时数据' }}</span>
            <a-icon v-if="step > 1" type="check" class="step-check" />
          </div>
          <div class="step-item" :class="{ done: step > 2, active: step === 2 }">
            <span class="step-dot"></span>
            <span class="step-text">{{ $t('fastAnalysis.step2') || '计算技术指标' }}</span>
            <a-icon v-if="step > 2" type="check" class="step-check" />
          </div>
          <div class="step-item" :class="{ done: step > 3, active: step === 3 }">
            <span class="step-dot"></span>
            <span class="step-text">{{ $t('fastAnalysis.step3') || 'AI深度分析' }}</span>
            <a-icon v-if="step > 3" type="check" class="step-check" />
          </div>
          <div class="step-item" :class="{ done: step > 4, active: step === 4 }">
            <span class="step-dot"></span>
            <span class="step-text">{{ $t('fastAnalysis.step4') || '生成报告' }}</span>
            <a-icon v-if="step > 4" type="check" class="step-check" />
          </div>
        </div>

        <div class="loading-footer">
          <span class="elapsed-time">{{ elapsedTimeText }}</span>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <a-result
        :status="errorTone === 'warning' ? 'warning' : 'error'"
        :title="errorTitle"
        :sub-title="error"
      >
        <template #extra>
          <a-button type="primary" @click="$emit('retry')">
            {{ $t('fastAnalysis.retry') }}
          </a-button>
        </template>
      </a-result>
    </div>

    <!-- Empty State -->
    <div v-else-if="!result" class="empty-container">
      <div class="empty-content">
        <a-icon type="radar-chart" class="empty-icon" />
        <div class="empty-title">{{ $t('fastAnalysis.selectSymbol') }}</div>
        <div class="empty-hint">{{ $t('fastAnalysis.selectHint') }}</div>
      </div>
    </div>

    <!-- Result Display -->
    <div v-else class="result-container">
      <!-- Header: Decision Card -->
      <div class="decision-card" :class="decisionClass">
        <div class="decision-main">
          <div class="decision-badge">
            <a-icon :type="decisionIcon" />
            <span class="decision-text">{{ result.decision }}</span>
          </div>
          <div class="confidence-ring">
            <a-progress
              type="circle"
              :percent="result.confidence"
              :width="80"
              :strokeColor="confidenceColor"
            >
              <template #format="percent">
                <span class="confidence-value">{{ percent }}%</span>
              </template>
            </a-progress>
            <div class="confidence-label">{{ $t('fastAnalysis.confidence') }}</div>
          </div>
        </div>
        <div class="decision-summary">
          {{ result.summary }}
        </div>
        <div v-if="consensusBlock" class="consensus-strip">
          <div class="consensus-strip-title">
            <a-icon type="cluster" />
            {{ $t('fastAnalysis.consensusTitle') }}
          </div>
          <div class="consensus-strip-metrics">
            <span class="cm-item">
              <em>{{ $t('fastAnalysis.consensusDecision') }}</em>
              {{ consensusBlock.consensus_decision }}
            </span>
            <span class="cm-item">
              <em>{{ $t('fastAnalysis.consensusScore') }}</em>
              {{ formatConsensusNum(consensusBlock.consensus_score) }}
            </span>
            <span v-if="consensusBlock.agreement_ratio != null" class="cm-item">
              <em>{{ $t('fastAnalysis.consensusAgreement') }}</em>
              {{ formatAgreementPct(consensusBlock.agreement_ratio) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Price Info Row -->
      <div class="price-info-row">
        <div class="price-card current">
          <div class="price-label">{{ $t('fastAnalysis.currentPrice') }}</div>
          <div class="price-value">${{ formatPrice(result.market_data?.current_price) }}</div>
          <div class="price-change" :class="result.market_data?.change_24h >= 0 ? 'positive' : 'negative'">
            {{ result.market_data?.change_24h >= 0 ? '+' : '' }}{{ formatNumber(result.market_data?.change_24h, 2) }}%
          </div>
        </div>
        <div class="price-card entry">
          <div class="price-label">{{ $t('fastAnalysis.entryPrice') }}</div>
          <div class="price-value">${{ formatPrice(result.trading_plan?.entry_price) }}</div>
        </div>
        <div class="price-card stop">
          <div class="price-label">{{ $t('fastAnalysis.stopLoss') }}</div>
          <div class="price-value negative">${{ formatPrice(result.trading_plan?.stop_loss) }}</div>
          <div class="price-hint">
            <a-tooltip :title="$t('fastAnalysis.stopLossHint')">
              <a-icon type="info-circle" /> {{ $t('fastAnalysis.atrBased') }}
            </a-tooltip>
          </div>
        </div>
        <div class="price-card target">
          <div class="price-label">{{ $t('fastAnalysis.takeProfit') }}</div>
          <div class="price-value positive">${{ formatPrice(result.trading_plan?.take_profit) }}</div>
          <div class="price-hint">
            <a-tooltip :title="$t('fastAnalysis.takeProfitHint')">
              <a-icon type="info-circle" /> {{ $t('fastAnalysis.atrBased') }}
            </a-tooltip>
          </div>
        </div>
      </div>

      <!-- Scores Row -->
      <div class="scores-row">
        <div class="score-item">
          <div class="score-header">
            <a-icon type="line-chart" />
            <span>{{ $t('fastAnalysis.technical') }}</span>
          </div>
          <a-progress
            :percent="result.scores?.technical || 50"
            :strokeColor="getScoreColor(result.scores?.technical)"
            :showInfo="false"
          />
          <div class="score-value">{{ result.scores?.technical || 50 }}</div>
        </div>
        <div class="score-item">
          <div class="score-header">
            <a-icon type="bank" />
            <span>{{ $t('fastAnalysis.fundamental') }}</span>
          </div>
          <a-progress
            :percent="result.scores?.fundamental || 50"
            :strokeColor="getScoreColor(result.scores?.fundamental)"
            :showInfo="false"
          />
          <div class="score-value">{{ result.scores?.fundamental || 50 }}</div>
        </div>
        <div class="score-item">
          <div class="score-header">
            <a-icon type="heart" />
            <span>{{ $t('fastAnalysis.sentiment') }}</span>
          </div>
          <a-progress
            :percent="result.scores?.sentiment || 50"
            :strokeColor="getScoreColor(result.scores?.sentiment)"
            :showInfo="false"
          />
          <div class="score-value">{{ result.scores?.sentiment || 50 }}</div>
        </div>
        <div class="score-item overall">
          <div class="score-header">
            <a-icon type="dashboard" />
            <span>{{ $t('fastAnalysis.overall') }}</span>
          </div>
          <a-progress
            :percent="result.scores?.overall || 50"
            :strokeColor="getScoreColor(result.scores?.overall)"
            :showInfo="false"
          />
          <div class="score-value">{{ result.scores?.overall || 50 }}</div>
        </div>
      </div>

      <!-- Detailed Analysis Sections -->
      <div class="detailed-analysis" v-if="result.detailed_analysis">
        <!-- Technical Analysis -->
        <div class="analysis-card technical" v-if="result.detailed_analysis.technical">
          <div class="analysis-card-header">
            <a-icon type="line-chart" />
            <span>{{ $t('fastAnalysis.technicalAnalysis') }}</span>
            <a-tag :color="getScoreTagColor(result.scores?.technical)">
              {{ result.scores?.technical || 50 }}分
            </a-tag>
          </div>
          <div class="analysis-card-content">
            {{ result.detailed_analysis.technical }}
          </div>
        </div>

        <!-- Fundamental Analysis -->
        <div class="analysis-card fundamental" v-if="result.detailed_analysis.fundamental">
          <div class="analysis-card-header">
            <a-icon type="bank" />
            <span>{{ $t('fastAnalysis.fundamentalAnalysis') }}</span>
            <a-tag :color="getScoreTagColor(result.scores?.fundamental)">
              {{ result.scores?.fundamental || 50 }}分
            </a-tag>
          </div>
          <div class="analysis-card-content">
            {{ result.detailed_analysis.fundamental }}
          </div>
        </div>

        <!-- Sentiment Analysis -->
        <div class="analysis-card sentiment" v-if="result.detailed_analysis.sentiment">
          <div class="analysis-card-header">
            <a-icon type="heart" />
            <span>{{ $t('fastAnalysis.sentimentAnalysis') }}</span>
            <a-tag :color="getScoreTagColor(result.scores?.sentiment)">
              {{ result.scores?.sentiment || 50 }}分
            </a-tag>
          </div>
          <div class="analysis-card-content">
            {{ result.detailed_analysis.sentiment }}
          </div>
        </div>
      </div>

      <!-- Reasons & Risks -->
      <div class="analysis-details">
        <div class="detail-section reasons">
          <div class="section-title">
            <a-icon type="bulb" theme="twoTone" twoToneColor="#52c41a" />
            <span>{{ $t('fastAnalysis.keyReasons') }}</span>
          </div>
          <ul class="detail-list">
            <li v-for="(reason, idx) in result.reasons" :key="'r-'+idx">
              {{ reason }}
            </li>
          </ul>
        </div>
        <div class="detail-section risks">
          <div class="section-title">
            <a-icon type="warning" theme="twoTone" twoToneColor="#faad14" />
            <span>{{ $t('fastAnalysis.risks') }}</span>
          </div>
          <ul class="detail-list">
            <li v-for="(risk, idx) in result.risks" :key="'k-'+idx">
              {{ risk }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Technical Indicators -->
      <div class="indicators-section" v-if="result.indicators && Object.keys(result.indicators).length > 0">
        <div class="section-title">
          <a-icon type="stock" />
          <span>{{ $t('fastAnalysis.indicators') }}</span>
        </div>
        <div class="indicators-grid">
          <div class="indicator-item" v-if="result.indicators.rsi">
            <div class="indicator-name">RSI (14)</div>
            <div class="indicator-value" :class="getRsiClass(result.indicators.rsi.value)">
              {{ formatNumber(result.indicators.rsi.value, 1) }}
            </div>
            <div class="indicator-signal">{{ translateSignal(result.indicators.rsi.signal) }}</div>
          </div>
          <div class="indicator-item" v-if="result.indicators.macd">
            <div class="indicator-name">MACD</div>
            <div class="indicator-value" :class="result.indicators.macd.signal === 'bullish' ? 'bullish' : (result.indicators.macd.signal === 'bearish' ? 'bearish' : '')">
              {{ translateTrend(result.indicators.macd.trend) }}
            </div>
            <div class="indicator-signal">{{ translateSignal(result.indicators.macd.signal) }}</div>
          </div>
          <div class="indicator-item" v-if="result.indicators.moving_averages">
            <div class="indicator-name">{{ $t('fastAnalysis.maTrend') }}</div>
            <div class="indicator-value" :class="getMaTrendClass(result.indicators.moving_averages.trend)">
              {{ translateTrend(result.indicators.moving_averages.trend) }}
            </div>
          </div>
          <div class="indicator-item" v-if="result.indicators.levels">
            <div class="indicator-name">{{ $t('fastAnalysis.support') }}</div>
            <div class="indicator-value">${{ formatPrice(result.indicators.levels.support) }}</div>
          </div>
          <div class="indicator-item" v-if="result.indicators.levels">
            <div class="indicator-name">{{ $t('fastAnalysis.resistance') }}</div>
            <div class="indicator-value">${{ formatPrice(result.indicators.levels.resistance) }}</div>
          </div>
          <div class="indicator-item" v-if="result.indicators.volatility">
            <div class="indicator-name">{{ $t('fastAnalysis.volatility') }}</div>
            <div class="indicator-value" :class="getVolatilityClass(result.indicators.volatility.level)">
              {{ translateVolatility(result.indicators.volatility.level) }} ({{ result.indicators.volatility.pct }}%)
            </div>
          </div>
        </div>
      </div>

      <!-- Feedback Section -->
      <div class="feedback-section">
        <div class="feedback-question">{{ $t('fastAnalysis.wasHelpful') }}</div>
        <div class="feedback-buttons">
          <a-button
            :type="userFeedback === 'helpful' ? 'primary' : 'default'"
            size="small"
            @click="submitFeedback('helpful')"
            :loading="feedbackLoading === 'helpful'"
          >
            <a-icon type="like" />
            {{ $t('fastAnalysis.helpful') }}
          </a-button>
          <a-button
            :type="userFeedback === 'not_helpful' ? 'danger' : 'default'"
            size="small"
            @click="submitFeedback('not_helpful')"
            :loading="feedbackLoading === 'not_helpful'"
          >
            <a-icon type="dislike" />
            {{ $t('fastAnalysis.notHelpful') }}
          </a-button>
        </div>
        <div class="analysis-meta">
          <span>{{ $t('fastAnalysis.analysisTime') }}: {{ result.analysis_time_ms }}ms</span>
          <span v-if="result.memory_id">ID: #{{ result.memory_id }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { submitFeedback as submitFeedbackApi } from '@/api/fast-analysis'

export default {
  name: 'FastAnalysisReport',
  props: {
    result: {
      type: Object,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: null
    },
    errorTone: {
      type: String,
      default: 'error',
      validator: (v) => ['error', 'warning', 'info'].includes(v)
    }
  },
  data () {
    return {
      userFeedback: null,
      feedbackLoading: null,
      // 简化的进度系统
      progress: 0, // 0-95
      elapsedSeconds: 0,
      mainTimer: null
    }
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme
    }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    progressPercent () {
      // 限制小数位数，避免显示过多小数（如 90.20000000001%）
      return Math.round(this.progress * 10) / 10
    },
    // 根据进度计算当前步骤
    step () {
      if (this.progress < 25) return 1
      if (this.progress < 50) return 2
      if (this.progress < 75) return 3
      return 4
    },
    currentStepText () {
      const steps = {
        1: this.$t('fastAnalysis.step1') || '获取实时数据',
        2: this.$t('fastAnalysis.step2') || '计算技术指标',
        3: this.$t('fastAnalysis.step3') || 'AI深度分析',
        4: this.$t('fastAnalysis.step4') || '生成报告'
      }
      return steps[this.step] || this.$t('fastAnalysis.preparing') || '准备中...'
    },
    elapsedTimeText () {
      if (this.elapsedSeconds < 60) {
        return `${this.elapsedSeconds}s`
      }
      const mins = Math.floor(this.elapsedSeconds / 60)
      const secs = this.elapsedSeconds % 60
      return `${mins}m ${secs}s`
    },
    decisionClass () {
      if (!this.result) return ''
      const d = this.result.decision
      if (d === 'BUY') return 'decision-buy'
      if (d === 'SELL') return 'decision-sell'
      return 'decision-hold'
    },
    decisionIcon () {
      if (!this.result) return 'question'
      const d = this.result.decision
      if (d === 'BUY') return 'arrow-up'
      if (d === 'SELL') return 'arrow-down'
      return 'pause'
    },
    confidenceColor () {
      const c = this.result?.confidence || 50
      if (c >= 70) return '#52c41a'
      if (c >= 50) return '#1890ff'
      return '#faad14'
    },
    consensusBlock () {
      const c = this.result?.consensus
      if (!c || typeof c !== 'object') return null
      if (c.consensus_decision == null && c.consensus_score == null) return null
      return c
    },
    insufficientCreditsError () {
      if (!this.error) return false
      const e = String(this.error)
      return e.includes('积分不足') || e.toLowerCase().includes('insufficient credits')
    },
    errorTitle () {
      if (this.errorTone === 'warning') {
        return this.$t('fastAnalysis.analysisInProgressTitle')
      }
      if (this.insufficientCreditsError) {
        return this.$t('fastAnalysis.insufficientCredits')
      }
      return this.$t('fastAnalysis.error')
    }
  },
  watch: {
    result () {
      // Reset feedback when result changes
      this.userFeedback = null
    },
    loading: {
      handler (newVal) {
        if (newVal) {
          this.startProgressTimer()
        } else {
          this.stopProgressTimer()
        }
      },
      immediate: true
    }
  },
  mounted () {
    // 双重保险
    if (this.loading) {
      this.startProgressTimer()
    }
  },
  beforeDestroy () {
    this.stopProgressTimer()
  },
  methods: {
    formatPrice (value) {
      if (value === undefined || value === null) return '--'
      const num = parseFloat(value)
      if (isNaN(num)) return '--'
      // Smart formatting: more decimals for small numbers
      if (num < 1) return num.toFixed(6)
      if (num < 100) return num.toFixed(4)
      if (num < 10000) return num.toFixed(2)
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    formatNumber (value, decimals = 2) {
      if (value === undefined || value === null) return '--'
      const num = parseFloat(value)
      if (isNaN(num)) return '--'
      return num.toFixed(decimals)
    },
    formatConsensusNum (n) {
      if (n === undefined || n === null || n === '') return '--'
      const x = Number(n)
      return Number.isNaN(x) ? '--' : x.toFixed(1)
    },
    formatAgreementPct (r) {
      const x = Number(r)
      if (Number.isNaN(x)) return '--'
      return `${Math.round(x * 100)}%`
    },
    formatProgress (value) {
      // 格式化进度显示，最多显示1位小数
      const num = parseFloat(value) || 0
      // 如果是整数，不显示小数；否则显示1位小数
      return num % 1 === 0 ? num.toFixed(0) : num.toFixed(1)
    },
    getScoreColor (score) {
      if (score >= 70) return '#52c41a'
      if (score >= 50) return '#1890ff'
      if (score >= 30) return '#faad14'
      return '#ff4d4f'
    },
    getScoreTagColor (score) {
      if (score >= 70) return 'green'
      if (score >= 50) return 'blue'
      if (score >= 30) return 'orange'
      return 'red'
    },
    getRsiClass (value) {
      if (value < 30) return 'oversold'
      if (value > 70) return 'overbought'
      return ''
    },
    getMaTrendClass (trend) {
      if (!trend) return ''
      if (trend.includes('uptrend') || trend.includes('strong_uptrend')) return 'bullish'
      if (trend.includes('downtrend') || trend.includes('strong_downtrend')) return 'bearish'
      return ''
    },
    getVolatilityClass (level) {
      if (level === 'high') return 'high-volatility'
      if (level === 'low') return 'low-volatility'
      return ''
    },
    // 翻译技术指标信号
    translateSignal (signal) {
      if (!signal) return '--'
      const key = `fastAnalysis.signal.${signal}`
      const translated = this.$t(key)
      // 如果翻译键不存在,返回原值
      return translated === key ? signal : translated
    },
    // 翻译趋势
    translateTrend (trend) {
      if (!trend) return '--'
      const key = `fastAnalysis.trend.${trend}`
      const translated = this.$t(key)
      return translated === key ? trend : translated
    },
    // 翻译波动性
    translateVolatility (level) {
      if (!level) return '--'
      const key = `fastAnalysis.volatilityLevel.${level}`
      const translated = this.$t(key)
      return translated === key ? level : translated
    },
    async submitFeedback (feedback) {
      if (!this.result?.memory_id) {
        // memory_id 不存在时提示用户（可能是后端版本旧或存储失败）
        this.$message.warning(this.$t('fastAnalysis.feedbackUnavailable') || '反馈功能暂不可用，请刷新后重试')
        return
      }

      this.feedbackLoading = feedback
      try {
        await submitFeedbackApi({
          memory_id: this.result.memory_id,
          feedback: feedback
        })
        this.userFeedback = feedback
        this.$message.success(this.$t('fastAnalysis.feedbackThanks'))
      } catch (e) {
        console.error('Feedback error:', e)
        this.$message.error(this.$t('fastAnalysis.feedbackFailed'))
      } finally {
        this.feedbackLoading = null
      }
    },
    startProgressTimer () {
      // 先清除已有的定时器
      this.stopProgressTimer()

      // 重置状态
      this.progress = 0
      this.elapsedSeconds = 0

      const startTime = Date.now()

      // 单一定时器：每100ms更新一次
      this.mainTimer = window.setInterval(() => {
        // 更新秒数
        this.elapsedSeconds = Math.floor((Date.now() - startTime) / 1000)

        // 更新进度 - 大约12秒走完95%
        if (this.progress < 75) {
          // 前75%：每100ms增加1% (约7.5秒)
          this.progress = Math.min(this.progress + 1, 75)
        } else if (this.progress < 90) {
          // 75-90%：每100ms增加0.5% (约3秒)
          this.progress = Math.min(this.progress + 0.5, 90)
        } else if (this.progress < 95) {
          // 90-95%：每100ms增加0.2% (约2.5秒)
          this.progress = Math.min(this.progress + 0.2, 95)
        }
        // 95%后停止增长，等待实际完成
      }, 100)
    },
    stopProgressTimer () {
      if (this.mainTimer) {
        window.clearInterval(this.mainTimer)
        this.mainTimer = null
      }
      this.progress = 0
      this.elapsedSeconds = 0
    }
  }
}
</script>

<style lang="less" scoped>
.fast-analysis-report {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  border-radius: 12px;

  // Loading State - 专业进度条
  .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    background: #fff;
    border-radius: 12px;

    .loading-content-pro {
      width: 100%;
      max-width: 400px;
      padding: 40px;

      .loading-header {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        margin-bottom: 32px;

        .loading-icon-pro {
          font-size: 28px;
          color: #1890ff;
        }

        .loading-title {
          font-size: 20px;
          font-weight: 600;
          color: #1e293b;
        }
      }

      .progress-wrapper {
        margin-bottom: 24px;
        position: relative;

        .progress-text {
          position: absolute;
          right: 0;
          top: -24px;
          font-size: 14px;
          font-weight: 600;
          color: #1890ff;
        }
      }

      .current-step {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 20px;
        background: #f0f5ff;
        border-radius: 8px;
        margin-bottom: 24px;
        color: #1890ff;
        font-size: 14px;
        font-weight: 500;

        .anticon { font-size: 16px; }
      }

      .steps-list {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .step-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          background: #f8fafc;
          border-radius: 8px;
          font-size: 13px;
          color: #94a3b8;
          transition: all 0.3s;

          .step-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #e2e8f0;
            transition: all 0.3s;
          }

          .step-text { flex: 1; }

          .step-check {
            color: #52c41a;
            font-size: 14px;
          }

          &.active {
            background: #e6f7ff;
            color: #1890ff;
            font-weight: 500;
            .step-dot { background: #1890ff; box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.2); }
          }

          &.done {
            background: #f6ffed;
            color: #52c41a;
            .step-dot { background: #52c41a; }
          }
        }
      }

      .loading-footer {
        margin-top: 24px;
        text-align: center;

        .elapsed-time {
          font-size: 13px;
          color: #94a3b8;
          font-family: 'SF Mono', Monaco, monospace;
        }
      }
    }
  }

  // Empty State
  .empty-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;

    .empty-content {
      text-align: center;

      .empty-icon {
        font-size: 64px;
        color: #d9d9d9;
      }

      .empty-title {
        margin-top: 16px;
        font-size: 18px;
        font-weight: 600;
        color: #262626;
      }

      .empty-hint {
        margin-top: 8px;
        color: #8c8c8c;
      }
    }
  }

  // Result Container
  .result-container {
    .decision-card {
      background: #fff;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      border-left: 6px solid #1890ff;

      &.decision-buy {
        border-left-color: #52c41a;
        background: linear-gradient(135deg, #f6ffed 0%, #fff 100%);
      }

      &.decision-sell {
        border-left-color: #ff4d4f;
        background: linear-gradient(135deg, #fff2f0 0%, #fff 100%);
      }

      &.decision-hold {
        border-left-color: #faad14;
        background: linear-gradient(135deg, #fffbe6 0%, #fff 100%);
      }

      .decision-main {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;

        .decision-badge {
          display: flex;
          align-items: center;
          gap: 12px;

          .anticon {
            font-size: 32px;
          }

          .decision-text {
            font-size: 36px;
            font-weight: 800;
            letter-spacing: 2px;
          }
        }

        .confidence-ring {
          text-align: center;

          .confidence-value {
            font-size: 18px;
            font-weight: 700;
          }

          .confidence-label {
            font-size: 12px;
            color: #8c8c8c;
            margin-top: 4px;
          }
        }
      }

      .decision-summary {
        font-size: 16px;
        line-height: 1.6;
        color: #595959;
        padding-top: 16px;
        border-top: 1px dashed #e8e8e8;
      }

      .consensus-strip {
        margin-top: 14px;
        padding: 12px 14px;
        border-radius: 8px;
        background: rgba(24, 144, 255, 0.06);
        border: 1px solid rgba(24, 144, 255, 0.2);
        font-size: 13px;
        color: #434343;

        .consensus-strip-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          margin-bottom: 8px;
          color: #1890ff;
        }

        .consensus-strip-metrics {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 20px;

          .cm-item {
            em {
              font-style: normal;
              color: #8c8c8c;
              margin-right: 6px;
            }
          }
        }
      }
    }

    // Price Info Row
    .price-info-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 20px;

      .price-card {
        background: #fff;
        border-radius: 12px;
        padding: 16px;
        text-align: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);

        .price-label {
          font-size: 12px;
          color: #8c8c8c;
          margin-bottom: 8px;
        }

        .price-value {
          font-size: 18px;
          font-weight: 700;
          color: #262626;

          &.positive { color: #52c41a; }
          &.negative { color: #ff4d4f; }
        }

        .price-hint {
          font-size: 10px;
          color: #bfbfbf;
          margin-top: 6px;
          cursor: help;

          .anticon {
            margin-right: 2px;
          }
        }

        .price-change {
          font-size: 14px;
          margin-top: 4px;
          font-weight: 600;

          &.positive { color: #52c41a; }
          &.negative { color: #ff4d4f; }
        }

        &.current { border-top: 3px solid #1890ff; }
        &.entry { border-top: 3px solid #722ed1; }
        &.stop { border-top: 3px solid #ff4d4f; }
        &.target { border-top: 3px solid #52c41a; }
      }
    }

    // Scores Row
    .scores-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 20px;

      .score-item {
        background: #fff;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);

        .score-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #595959;
          margin-bottom: 12px;

          .anticon { color: #1890ff; }
        }

        .score-value {
          text-align: right;
          font-size: 20px;
          font-weight: 700;
          color: #262626;
          margin-top: 8px;
        }

        &.overall {
          background: linear-gradient(135deg, #e6f7ff 0%, #fff 100%);
          border: 1px solid #91d5ff;
        }
      }
    }

    // Analysis Details
    // 详细分析卡片
    .detailed-analysis {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 20px;

      .analysis-card {
        background: linear-gradient(135deg, #fff 0%, #fafafa 100%);
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        border-left: 4px solid #1890ff;

        &.technical { border-left-color: #1890ff; }
        &.fundamental { border-left-color: #722ed1; }
        &.sentiment { border-left-color: #eb2f96; }

        .analysis-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
          font-size: 16px;
          font-weight: 600;
          color: #262626;

          .anticon {
            font-size: 20px;
          }

          &.technical .anticon { color: #1890ff; }
          &.fundamental .anticon { color: #722ed1; }
          &.sentiment .anticon { color: #eb2f96; }
        }

        .analysis-card-content {
          font-size: 14px;
          line-height: 1.8;
          color: #595959;
          text-align: justify;
        }
      }
    }

    .analysis-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;

      .detail-section {
        background: #fff;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #262626;
        }

        .detail-list {
          list-style: none;
          padding: 0;
          margin: 0;

          li {
            padding: 10px 0;
            border-bottom: 1px solid #f0f0f0;
            font-size: 14px;
            line-height: 1.6;
            color: #595959;

            &:last-child { border-bottom: none; }

            &::before {
              content: '•';
              margin-right: 8px;
              color: #1890ff;
            }
          }
        }

        &.reasons {
          border-left: 4px solid #52c41a;
        }

        &.risks {
          border-left: 4px solid #faad14;
        }
      }
    }

    // Indicators Section
    .indicators-section {
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);

      .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 16px;
        color: #262626;

        .anticon { color: #1890ff; }
      }

      .indicators-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 16px;

        .indicator-item {
          background: #fafafa;
          border-radius: 8px;
          padding: 12px;
          text-align: center;

          .indicator-name {
            font-size: 12px;
            color: #8c8c8c;
            margin-bottom: 8px;
          }

          .indicator-value {
            font-size: 16px;
            font-weight: 600;
            color: #262626;

            &.bullish, &.oversold { color: #52c41a; }
            &.bearish, &.overbought { color: #ff4d4f; }
            &.high-volatility { color: #ff4d4f; }
            &.low-volatility { color: #52c41a; }
          }

          .indicator-signal {
            font-size: 11px;
            color: #8c8c8c;
            margin-top: 4px;
            text-transform: capitalize;
          }
        }
      }
    }

    // Feedback Section
    .feedback-section {
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);

      .feedback-question {
        font-size: 14px;
        color: #595959;
        margin-bottom: 12px;
      }

      .feedback-buttons {
        display: flex;
        justify-content: center;
        gap: 16px;
        margin-bottom: 16px;

        .ant-btn {
          min-width: 100px;
        }
      }

      .analysis-meta {
        font-size: 12px;
        color: #8c8c8c;
        display: flex;
        justify-content: center;
        gap: 16px;
      }
    }
  }

  // Responsive
  @media (max-width: 992px) {
    .price-info-row,
    .scores-row {
      grid-template-columns: repeat(2, 1fr);
    }

    .analysis-details {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 576px) {
    padding: 12px;

    .price-info-row,
    .scores-row {
      grid-template-columns: 1fr;
    }

    .decision-card {
      padding: 16px;

      .decision-main {
        flex-direction: column;
        gap: 16px;
        text-align: center;

        .decision-badge {
          flex-direction: column;

          .decision-text {
            font-size: 28px;
          }
        }
      }
    }
  }
}

// Dark Theme
.fast-analysis-report.theme-dark {
  background: linear-gradient(135deg, #1e222d 0%, #131722 100%);

  .loading-content .loading-text { color: #00e5ff; }
  .empty-content .empty-title { color: #d1d4dc; }

  .decision-card {
    background: #2a2e39;
    border-left-color: #1890ff;

    &.decision-buy {
      background: linear-gradient(135deg, rgba(82, 196, 26, 0.1) 0%, #2a2e39 100%);
    }

    &.decision-sell {
      background: linear-gradient(135deg, rgba(255, 77, 79, 0.1) 0%, #2a2e39 100%);
    }

    &.decision-hold {
      background: linear-gradient(135deg, rgba(250, 173, 20, 0.1) 0%, #2a2e39 100%);
    }

    .decision-summary {
      color: #868993;
      border-top-color: #363c4e;
    }

    .consensus-strip {
      background: rgba(24, 144, 255, 0.12);
      border-color: rgba(24, 144, 255, 0.35);
      color: #d1d4dc;

      .consensus-strip-title {
        color: #69c0ff;
      }

      .consensus-strip-metrics .cm-item em {
        color: #868993;
      }
    }
  }

  .detailed-analysis .analysis-card {
    background: linear-gradient(135deg, #2a2e39 0%, #1e222d 100%);

    &.technical { border-left-color: #1890ff; }
    &.fundamental { border-left-color: #722ed1; }
    &.sentiment { border-left-color: #eb2f96; }

    .analysis-card-header {
      color: #d1d4dc;
    }

    .analysis-card-content {
      color: #868993;
    }
  }

  .price-card,
  .score-item,
  .detail-section,
  .indicators-section,
  .feedback-section {
    background: #2a2e39;
    color: #d1d4dc;

    .price-label,
    .score-header,
    .section-title,
    .indicator-name,
    .indicator-signal,
    .feedback-question,
    .analysis-meta {
      color: #868993;
    }

    .price-value,
    .score-value,
    .indicator-value {
      color: #d1d4dc;
    }
  }

  .score-item.overall {
    background: linear-gradient(135deg, rgba(24, 144, 255, 0.1) 0%, #2a2e39 100%);
    border-color: #1890ff;
  }

  .detail-list li {
    color: #868993;
    border-bottom-color: #363c4e;
  }

  .indicators-grid .indicator-item {
    background: #363c4e;
  }
}
</style>

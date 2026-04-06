<template>
  <a-alert
    v-if="lines.length || showLegacy"
    :type="showLegacy ? 'warning' : 'info'"
    show-icon
    style="margin-bottom: 12px;"
  >
    <template slot="message">
      {{
        showLegacy
          ? $t('dashboard.indicator.backtest.executionAssumptions.legacyTitle')
          : $t('dashboard.indicator.backtest.executionAssumptions.title')
      }}
    </template>
    <template slot="description">
      <div v-if="showLegacy" style="font-size: 12px; line-height: 1.5;">
        {{ $t('dashboard.indicator.backtest.executionAssumptions.legacyBody') }}
      </div>
      <div v-else>
        <div v-for="(line, idx) in lines" :key="idx" style="font-size: 12px; line-height: 1.5;">
          {{ line }}
        </div>
      </div>
    </template>
  </a-alert>
</template>

<script>
export default {
  name: 'BacktestExecutionAssumptionsAlert',
  props: {
    /** From API result (persisted in result_json) */
    assumptions: { type: Object, default: null },
    /** Run row strategy_config — used when result has no executionAssumptions */
    strategyConfig: { type: Object, default: null },
    /** Run timeframe — fallback when assumptions.strategyTimeframe missing */
    timeframe: { type: String, default: '' }
  },
  computed: {
    resolved () {
      const a = this.assumptions
      if (a && typeof a === 'object' && Object.keys(a).length) {
        if (a.signalTiming != null || a.defaultFillPrice != null || a.simulationMode != null) {
          return a
        }
      }
      const cfg = this.strategyConfig || {}
      const raw = (cfg.execution || {}).signalTiming
      if (raw != null && String(raw).trim() !== '') {
        const r = String(raw).toLowerCase()
        const isNext = ['next_bar_open', 'next_open', 'nextopen', 'next'].includes(r)
        return {
          signalTiming: isNext ? 'next_bar_open' : 'same_bar_close',
          defaultFillPrice: isNext ? 'open' : 'close',
          simulationMode: 'standard',
          mtfRequested: false,
          mtfActive: false
        }
      }
      return null
    },
    showLegacy () {
      return !this.resolved
    },
    lines () {
      const a = this.resolved
      if (!a) return []
      const lines = []
      if (a.signalTiming === 'same_bar_close') {
        lines.push(this.$t('dashboard.indicator.backtest.executionAssumptions.bodySameBar'))
      } else {
        lines.push(this.$t('dashboard.indicator.backtest.executionAssumptions.bodyNextBar'))
      }
      if (a.defaultFillPrice === 'open') {
        lines.push(this.$t('dashboard.indicator.backtest.executionAssumptions.fillOpen'))
      } else {
        lines.push(this.$t('dashboard.indicator.backtest.executionAssumptions.fillClose'))
      }
      if (a.simulationMode === 'mtf' && a.executionTimeframe) {
        const sigTf = a.strategyTimeframe || this.timeframe || ''
        lines.push(this.$t('dashboard.indicator.backtest.executionAssumptions.bodyMtf', {
          sig: sigTf,
          exec: a.executionTimeframe
        }))
      }
      if (a.mtfRequested && !a.mtfActive) {
        lines.push(this.$t('dashboard.indicator.backtest.executionAssumptions.mtfFallback'))
      }
      return lines
    }
  }
}
</script>

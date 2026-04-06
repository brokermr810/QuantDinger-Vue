<template>
  <div class="performance-analysis strategy-tab-pane-inner" :class="{ 'theme-dark': isDark }">
    <a-spin :spinning="loading">
      <div v-if="hasData">
        <!-- Metric Cards -->
        <div class="metrics-grid">
          <div class="metric-card" :class="getMetricClass(metrics.totalReturn)">
            <div class="metric-label">{{ $t('trading-assistant.performance.totalReturn') }}</div>
            <div class="metric-value">{{ formatPercent(metrics.totalReturn) }}</div>
          </div>
          <div class="metric-card" :class="getMetricClass(metrics.annualReturn)">
            <div class="metric-label">{{ $t('trading-assistant.performance.annualReturn') }}</div>
            <div class="metric-value">{{ formatPercent(metrics.annualReturn) }}</div>
          </div>
          <div class="metric-card negative">
            <div class="metric-label">{{ $t('trading-assistant.performance.maxDrawdown') }}</div>
            <div class="metric-value">{{ formatPercent(metrics.maxDrawdown) }}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">{{ $t('trading-assistant.performance.sharpe') }}</div>
            <div class="metric-value">{{ (metrics.sharpe || 0).toFixed(2) }}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">{{ $t('trading-assistant.performance.winRate') }}</div>
            <div class="metric-value">{{ formatPercent(metrics.winRate) }}</div>
          </div>
          <div class="metric-card" :class="getMetricClass((metrics.profitFactor || 0) - 1)">
            <div class="metric-label">{{ $t('trading-assistant.performance.profitFactor') }}</div>
            <div class="metric-value">{{ (metrics.profitFactor || 0).toFixed(2) }}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">{{ $t('trading-assistant.performance.totalTrades') }}</div>
            <div class="metric-value">{{ metrics.totalTrades || 0 }}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">{{ $t('trading-assistant.performance.runningDays') }}</div>
            <div class="metric-value">{{ metrics.runningDays || 0 }}</div>
          </div>
        </div>

        <!-- Equity Curve Chart -->
        <div class="chart-section">
          <div class="chart-title">{{ $t('trading-assistant.performance.equityCurve') }}</div>
          <div ref="equityChart" class="chart-container"></div>
        </div>

        <!-- Daily Returns Chart -->
        <div class="chart-section">
          <div class="chart-title">{{ $t('trading-assistant.performance.dailyReturns') }}</div>
          <div ref="dailyChart" class="chart-container" style="height: 250px;"></div>
        </div>
      </div>

      <a-empty
        v-else-if="!loading"
        :description="$t('trading-assistant.performance.noData')"
        class="strategy-tab-empty"
      />
    </a-spin>
  </div>
</template>

<script>
import { getStrategyEquityCurve } from '@/api/strategy'

export default {
  name: 'PerformanceAnalysis',
  props: {
    strategyId: { type: [Number, String], default: null },
    isDark: { type: Boolean, default: false }
  },
  data () {
    return {
      loading: false,
      metrics: {},
      equityData: [],
      dailyReturns: [],
      equityChartInstance: null,
      dailyChartInstance: null
    }
  },
  computed: {
    hasData () {
      return this.equityData.length > 0
    }
  },
  watch: {
    strategyId: {
      handler (val) {
        if (val) this.loadData()
      },
      immediate: true
    },
    isDark () {
      this.disposeCharts()
      this.$nextTick(() => this.renderCharts())
    }
  },
  beforeDestroy () {
    this.disposeCharts()
  },
  methods: {
    async loadData () {
      if (!this.strategyId) return
      this.loading = true
      try {
        const res = await getStrategyEquityCurve(this.strategyId)
        if (res && res.data) {
          this.equityData = res.data.equity_curve || res.data || []
          this.computeMetrics()
          this.$nextTick(() => this.renderCharts())
        }
      } catch (e) {
        console.error('Load performance failed:', e)
      } finally {
        this.loading = false
      }
    },

    computeMetrics () {
      const data = this.equityData
      if (!data.length) {
        this.metrics = {}
        return
      }

      const equities = data.map(d => d.equity || d.value || d.y || 0)
      const initial = equities[0] || 1
      const final = equities[equities.length - 1] || initial

      const totalReturn = (final - initial) / initial
      let maxPeak = equities[0]
      let maxDrawdown = 0
      const dailyRets = []

      for (let i = 1; i < equities.length; i++) {
        if (equities[i] > maxPeak) maxPeak = equities[i]
        const dd = (equities[i] - maxPeak) / maxPeak
        if (dd < maxDrawdown) maxDrawdown = dd
        dailyRets.push((equities[i] - equities[i - 1]) / equities[i - 1])
      }

      this.dailyReturns = dailyRets
      const days = data.length
      const annualFactor = 365 / Math.max(days, 1)

      const avgRet = dailyRets.length ? dailyRets.reduce((a, b) => a + b, 0) / dailyRets.length : 0
      const stdRet = dailyRets.length > 1
        ? Math.sqrt(dailyRets.reduce((s, r) => s + (r - avgRet) ** 2, 0) / (dailyRets.length - 1))
        : 0

      const trades = data.filter(d => d.trade_count).reduce((s, d) => s + d.trade_count, 0) || 0
      const wins = data.filter(d => d.win_count).reduce((s, d) => s + d.win_count, 0) || 0
      const grossProfit = data.filter(d => d.gross_profit).reduce((s, d) => s + d.gross_profit, 0)
      const grossLoss = Math.abs(data.filter(d => d.gross_loss).reduce((s, d) => s + d.gross_loss, 0))

      this.metrics = {
        totalReturn,
        annualReturn: Math.pow(1 + totalReturn, annualFactor) - 1,
        maxDrawdown,
        sharpe: stdRet > 0 ? (avgRet / stdRet) * Math.sqrt(252) : 0,
        winRate: trades > 0 ? wins / trades : 0,
        profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0,
        totalTrades: trades,
        runningDays: days
      }
    },

    async renderCharts () {
      const echarts = await this.getEcharts()
      if (!echarts) return
      this.renderEquityChart(echarts)
      this.renderDailyChart(echarts)
    },

    async getEcharts () {
      if (window.echarts) return window.echarts
      try {
        const mod = await import('echarts')
        window.echarts = mod.default || mod
        return window.echarts
      } catch {
        return null
      }
    },

    renderEquityChart (echarts) {
      if (!this.$refs.equityChart) return
      this.equityChartInstance = echarts.init(this.$refs.equityChart, this.isDark ? 'dark' : null)

      const xData = this.equityData.map(d => d.date || d.timestamp || d.x || '')
      const yData = this.equityData.map(d => d.equity || d.value || d.y || 0)

      this.equityChartInstance.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: 60, right: 20, top: 20, bottom: 30 },
        xAxis: { type: 'category', data: xData, axisLabel: { fontSize: 10 } },
        yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
        series: [{
          type: 'line',
          data: yData,
          smooth: true,
          lineStyle: { width: 2, color: '#1890ff' },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(24,144,255,0.3)' }, { offset: 1, color: 'rgba(24,144,255,0.02)' }] } },
          itemStyle: { color: '#1890ff' },
          showSymbol: false
        }]
      })
    },

    renderDailyChart (echarts) {
      if (!this.$refs.dailyChart || !this.dailyReturns.length) return
      this.dailyChartInstance = echarts.init(this.$refs.dailyChart, this.isDark ? 'dark' : null)

      this.dailyChartInstance.setOption({
        tooltip: { trigger: 'axis', formatter: p => `${(p[0].value * 100).toFixed(2)}%` },
        grid: { left: 60, right: 20, top: 10, bottom: 30 },
        xAxis: { type: 'category', data: this.dailyReturns.map((_, i) => i + 1), show: false },
        yAxis: { type: 'value', axisLabel: { formatter: v => (v * 100).toFixed(1) + '%', fontSize: 10 } },
        series: [{
          type: 'bar',
          data: this.dailyReturns.map(r => ({
            value: r,
            itemStyle: { color: r >= 0 ? '#52c41a' : '#ff4d4f' }
          })),
          barMaxWidth: 6
        }]
      })
    },

    disposeCharts () {
      if (this.equityChartInstance) {
        this.equityChartInstance.dispose()
        this.equityChartInstance = null
      }
      if (this.dailyChartInstance) {
        this.dailyChartInstance.dispose()
        this.dailyChartInstance = null
      }
    },

    formatPercent (val) {
      if (val === undefined || val === null) return '--'
      return (val >= 0 ? '+' : '') + (val * 100).toFixed(2) + '%'
    },

    getMetricClass (val) {
      if (!val) return ''
      return val > 0 ? 'positive' : val < 0 ? 'negative' : ''
    }
  }
}
</script>

<style lang="less" scoped>
.performance-analysis {
  padding: 4px 0;
}

.strategy-tab-empty {
  padding: 48px 16px;
  margin: 0 auto;
  max-width: 360px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.metric-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 12px 16px;
  text-align: center;

  &.positive .metric-value { color: #52c41a; }
  &.negative .metric-value { color: #ff4d4f; }

  .metric-label {
    font-size: 12px;
    color: #999;
    margin-bottom: 4px;
  }

  .metric-value {
    font-size: 18px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
}

.chart-section {
  margin-bottom: 20px;

  .chart-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 8px;
    padding-left: 4px;
  }
}

.chart-container {
  width: 100%;
  height: 300px;
  border-radius: 8px;
  overflow: hidden;
}

.theme-dark {
  .metrics-grid .metric-card {
    background: #1c1c1c;
    border: 1px solid rgba(255, 255, 255, 0.06);

    .metric-label {
      color: rgba(255, 255, 255, 0.4);
    }

    .metric-value {
      color: #e0e6ed;
    }

    &.positive .metric-value { color: #52c41a; }
    &.negative .metric-value { color: #ff4d4f; }
  }

  .chart-section {
    .chart-title {
      color: #e0e6ed;
    }
  }

  .chart-container {
    background: #141414;
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  /deep/ .ant-empty-description {
    color: rgba(255, 255, 255, 0.35);
  }

  .strategy-tab-empty /deep/ .ant-empty-description {
    color: rgba(255, 255, 255, 0.35);
  }
}
</style>

<template>
  <a-modal
    :title="modalTitle"
    :visible="visible"
    :width="1100"
    :maskClosable="false"
    :wrapClassName="modalWrapClass"
    @cancel="$emit('cancel')"
    class="backtest-run-viewer"
  >
    <div v-if="!run || !run.result" style="padding: 12px 0;">
      <a-empty :description="$t('dashboard.indicator.backtest.historyNoData')" />
    </div>

    <div v-else>
      <a-alert
        v-if="run.id"
        type="info"
        show-icon
        style="margin-bottom: 12px;"
        :message="$t('dashboard.indicator.backtest.savedRunId', { id: run.id })"
      />

      <backtest-execution-assumptions-alert
        :assumptions="result.executionAssumptions"
        :strategy-config="run.strategy_config"
        :timeframe="run.timeframe || ''"
      />

      <!-- Metrics -->
      <div class="metrics-cards">
        <div class="metric-card" :class="{ positive: result.totalReturn > 0, negative: result.totalReturn < 0 }">
          <div class="metric-label">{{ $t('dashboard.indicator.backtest.totalReturn') }}</div>
          <div class="metric-value">{{ formatPercent(result.totalReturn) }}</div>
          <div class="metric-amount">{{ formatMoney(result.totalProfit) }}</div>
        </div>
        <div class="metric-card" :class="{ positive: result.annualReturn > 0, negative: result.annualReturn < 0 }">
          <div class="metric-label">{{ $t('dashboard.indicator.backtest.annualReturn') }}</div>
          <div class="metric-value">{{ formatPercent(result.annualReturn) }}</div>
        </div>
        <div class="metric-card negative">
          <div class="metric-label">{{ $t('dashboard.indicator.backtest.maxDrawdown') }}</div>
          <div class="metric-value">{{ formatPercent(result.maxDrawdown) }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">{{ $t('dashboard.indicator.backtest.sharpeRatio') }}</div>
          <div class="metric-value">{{ (result.sharpeRatio ?? 0).toFixed(2) }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">{{ $t('dashboard.indicator.backtest.winRate') }}</div>
          <div class="metric-value">{{ formatPercent(result.winRate) }}</div>
        </div>
        <div class="metric-card" :class="{ positive: result.profitFactor >= 1.5, negative: result.profitFactor < 1 }">
          <div class="metric-label">{{ $t('dashboard.indicator.backtest.profitFactor') }}</div>
          <div class="metric-value">{{ (result.profitFactor ?? 0).toFixed(2) }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">{{ $t('dashboard.indicator.backtest.totalTrades') }}</div>
          <div class="metric-value">{{ result.totalTrades ?? 0 }}</div>
        </div>
        <div class="metric-card negative">
          <div class="metric-label">{{ $t('dashboard.indicator.backtest.totalCommission') }}</div>
          <div class="metric-value">-${{ result.totalCommission ? result.totalCommission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00' }}</div>
        </div>
      </div>

      <!-- Equity curve -->
      <div class="chart-section">
        <div class="chart-title">{{ $t('dashboard.indicator.backtest.equityCurve') }}</div>
        <div ref="equityChartRef" class="equity-chart"></div>
      </div>

      <!-- Trades -->
      <div class="trades-section">
        <div class="chart-title">{{ $t('dashboard.indicator.backtest.tradeHistory') }}</div>
        <a-table
          :columns="tradeColumns"
          :data-source="normalizedTrades"
          :pagination="{ pageSize: 10, size: 'small' }"
          size="small"
          :scroll="{ x: 800 }"
          :rowKey="rowKey"
        >
          <template slot="type" slot-scope="text">
            <a-tag :color="getTradeTypeColor(text)">
              {{ getTradeTypeText(text) }}
            </a-tag>
          </template>
          <template slot="balance" slot-scope="text">
            <span style="color: #1890ff; font-weight: 500;">
              ${{ text ? text.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--' }}
            </span>
          </template>
          <template slot="profit" slot-scope="text">
            <span :style="{ color: text > 0 ? '#52c41a' : text < 0 ? '#f5222d' : (isDark ? 'rgba(255,255,255,0.65)' : '#666') }">
              {{ formatMoney(text) }}
            </span>
          </template>
          <template slot="time" slot-scope="text">
            <span class="trade-time-text">{{ formatLocalDateTime(text) }}</span>
          </template>
          <template slot="detail" slot-scope="text, record">
            <span class="trade-detail-text">{{ getTradeDetailText(record.type) }}</span>
          </template>
        </a-table>
      </div>
    </div>

    <template slot="footer">
      <a-button @click="$emit('cancel')">{{ $t('dashboard.indicator.backtest.close') }}</a-button>
    </template>
  </a-modal>
</template>

<script>
import * as echarts from 'echarts'
import moment from 'moment'
import BacktestExecutionAssumptionsAlert from './BacktestExecutionAssumptionsAlert.vue'

export default {
  name: 'BacktestRunViewer',
  components: { BacktestExecutionAssumptionsAlert },
  props: {
    visible: { type: Boolean, default: false },
    run: { type: Object, default: null },
    isDark: { type: Boolean, default: false }
  },
  data () {
    return {
      equityChart: null,
      tradeColumns: []
    }
  },
  computed: {
    result () {
      return (this.run && this.run.result) ? this.run.result : {}
    },
    modalTitle () {
      const id = this.run && this.run.id ? `#${this.run.id}` : ''
      return `${this.$t('dashboard.indicator.backtest.historyTitle')} ${id}`.trim()
    },
    modalWrapClass () {
      return this.isDark ? 'backtest-run-viewer-wrap backtest-run-viewer-wrap--dark' : 'backtest-run-viewer-wrap'
    },
    normalizedTrades () {
      return (this.result.trades || []).map((item, index) => ({
        ...item,
        _rowKey: `${index}-${item.time || ''}-${item.type || ''}`
      }))
    }
  },
  watch: {
    visible (val) {
      if (val) {
        this.$nextTick(() => {
          this.initColumns()
          this.renderEquityChart()
        })
      } else {
        if (this.equityChart) {
          this.equityChart.dispose()
          this.equityChart = null
        }
      }
    },
    isDark () {
      if (this.visible) {
        this.$nextTick(() => this.renderEquityChart())
      }
    }
  },
  methods: {
    rowKey (record, index) {
      return record._rowKey || index
    },
    initColumns () {
      this.tradeColumns = [
        { title: this.$t('dashboard.indicator.backtest.tradeTime'), dataIndex: 'time', key: 'time', width: 170, scopedSlots: { customRender: 'time' } },
        { title: this.$t('dashboard.indicator.backtest.tradeType'), dataIndex: 'type', key: 'type', width: 150, scopedSlots: { customRender: 'type' } },
        { title: this.$t('dashboard.indicator.backtest.tradeDetail'), dataIndex: 'detail', key: 'detail', width: 180, scopedSlots: { customRender: 'detail' } },
        { title: this.$t('dashboard.indicator.backtest.price'), dataIndex: 'price', key: 'price', width: 110 },
        { title: this.$t('dashboard.indicator.backtest.amount'), dataIndex: 'amount', key: 'amount', width: 100 },
        { title: this.$t('dashboard.indicator.backtest.profit'), dataIndex: 'profit', key: 'profit', width: 110, scopedSlots: { customRender: 'profit' } },
        { title: this.$t('dashboard.indicator.backtest.balance'), dataIndex: 'balance', key: 'balance', width: 120, scopedSlots: { customRender: 'balance' } }
      ]
    },
    getTradeTypeColor (type) {
      const colorMap = {
        buy: 'green',
        sell: 'red',
        liquidation: 'orange',
        open_long: 'green',
        add_long: 'cyan',
        close_long: 'orange',
        close_long_stop: 'red',
        close_long_profit: 'lime',
        close_long_trailing: 'gold',
        reduce_long: 'volcano',
        open_short: 'red',
        add_short: 'magenta',
        close_short: 'blue',
        close_short_stop: 'red',
        close_short_profit: 'cyan',
        close_short_trailing: 'gold',
        reduce_short: 'volcano'
      }
      return colorMap[type] || 'default'
    },
    getTradeTypeText (type) {
      const textMap = {
        // New format - long
        open_long: this.$t('dashboard.indicator.backtest.openLong'),
        add_long: this.$t('dashboard.indicator.backtest.addLong'),
        close_long: this.$t('dashboard.indicator.backtest.closeLong'),
        close_long_stop: this.$t('dashboard.indicator.backtest.closeLongStop'),
        close_long_profit: this.$t('dashboard.indicator.backtest.closeLongProfit'),
        close_long_trailing: this.$t('dashboard.indicator.backtest.closeLongTrailing'),
        reduce_long: this.$t('dashboard.indicator.backtest.reduceLong'),
        // New format - short
        open_short: this.$t('dashboard.indicator.backtest.openShort'),
        add_short: this.$t('dashboard.indicator.backtest.addShort'),
        close_short: this.$t('dashboard.indicator.backtest.closeShort'),
        close_short_stop: this.$t('dashboard.indicator.backtest.closeShortStop'),
        close_short_profit: this.$t('dashboard.indicator.backtest.closeShortProfit'),
        close_short_trailing: this.$t('dashboard.indicator.backtest.closeShortTrailing'),
        reduce_short: this.$t('dashboard.indicator.backtest.reduceShort'),
        liquidation: this.$t('dashboard.indicator.backtest.liquidation')
      }
      return textMap[type] || type
    },
    getTradeDetailText (type) {
      const detailMap = {
        open_long: this.$t('dashboard.indicator.backtest.tradeDetailOpenLong'),
        add_long: this.$t('dashboard.indicator.backtest.tradeDetailAddLong'),
        close_long: this.$t('dashboard.indicator.backtest.tradeDetailCloseLong'),
        close_long_stop: this.$t('dashboard.indicator.backtest.tradeDetailCloseLongStop'),
        close_long_profit: this.$t('dashboard.indicator.backtest.tradeDetailCloseLongProfit'),
        close_long_trailing: this.$t('dashboard.indicator.backtest.tradeDetailCloseLongTrailing'),
        reduce_long: this.$t('dashboard.indicator.backtest.tradeDetailReduceLong'),
        open_short: this.$t('dashboard.indicator.backtest.tradeDetailOpenShort'),
        add_short: this.$t('dashboard.indicator.backtest.tradeDetailAddShort'),
        close_short: this.$t('dashboard.indicator.backtest.tradeDetailCloseShort'),
        close_short_stop: this.$t('dashboard.indicator.backtest.tradeDetailCloseShortStop'),
        close_short_profit: this.$t('dashboard.indicator.backtest.tradeDetailCloseShortProfit'),
        close_short_trailing: this.$t('dashboard.indicator.backtest.tradeDetailCloseShortTrailing'),
        reduce_short: this.$t('dashboard.indicator.backtest.tradeDetailReduceShort'),
        liquidation: this.$t('dashboard.indicator.backtest.tradeDetailLiquidation'),
        buy: this.$t('dashboard.indicator.backtest.tradeDetailBuy'),
        sell: this.$t('dashboard.indicator.backtest.tradeDetailSell')
      }
      return detailMap[type] || type
    },
    formatPercent (value) {
      if (value === null || value === undefined) return '--'
      const sign = value >= 0 ? '+' : ''
      return `${sign}${Number(value).toFixed(2)}%`
    },
    formatMoney (value) {
      if (value === null || value === undefined) return '--'
      const sign = value >= 0 ? '+' : '-'
      return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    parseDateTimeToLocal (value) {
      if (!value && value !== 0) return null
      if (moment.isMoment(value)) return value.clone()
      if (typeof value === 'number') {
        return String(value).length <= 10 ? moment.unix(value) : moment(value)
      }
      const raw = String(value).trim()
      if (!raw) return null
      if (/^\d+$/.test(raw)) {
        const n = Number(raw)
        return raw.length <= 10 ? moment.unix(n) : moment(n)
      }
      if (/[zZ]|[-+]\d{2}:\d{2}$/.test(raw)) {
        const zoned = moment(raw)
        return zoned.isValid() ? zoned.local() : null
      }
      if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
        const utcMoment = moment.utc(raw, ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm', 'YYYY-MM-DDTHH:mm:ss', moment.ISO_8601], true)
        return utcMoment.isValid() ? utcMoment.local() : null
      }
      const localMoment = moment(raw)
      return localMoment.isValid() ? localMoment : null
    },
    formatLocalDateTime (value) {
      const m = this.parseDateTimeToLocal(value)
      return m ? m.format('YYYY-MM-DD HH:mm:ss') : '--'
    },
    formatAxisDateTime (value) {
      const m = this.parseDateTimeToLocal(value)
      return m ? m.format('MM-DD HH:mm') : String(value || '')
    },
    renderEquityChart () {
      if (!this.$refs.equityChartRef) return
      if (this.equityChart) this.equityChart.dispose()
      this.equityChart = echarts.init(this.$refs.equityChartRef)

      const data = this.result.equityCurve || []
      const dates = data.map(item => this.formatAxisDateTime(item.time || item.date))
      const equity = data.map(item => item.value !== undefined ? item.value : item.equity)
      const initialValue = equity[0] || 100000
      const finalValue = equity[equity.length - 1] || initialValue
      const isPositive = finalValue >= initialValue
      const mainColor = isPositive ? '#52c41a' : '#f5222d'
      const gradientColor = isPositive
        ? [{ offset: 0, color: 'rgba(82, 196, 26, 0.35)' }, { offset: 1, color: 'rgba(82, 196, 26, 0.02)' }]
        : [{ offset: 0, color: 'rgba(245, 34, 45, 0.35)' }, { offset: 1, color: 'rgba(245, 34, 45, 0.02)' }]

      const option = {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          backgroundColor: this.isDark ? '#1f1f1f' : '#fff',
          borderColor: this.isDark ? '#434343' : '#ddd',
          textStyle: { color: this.isDark ? 'rgba(255,255,255,0.88)' : '#333' }
        },
        grid: { left: '3%', right: '4%', bottom: '12%', top: '8%', containLabel: true },
        xAxis: {
          type: 'category',
          data: dates,
          boundaryGap: false,
          axisLabel: { color: this.isDark ? 'rgba(255,255,255,0.45)' : '#8c8c8c' },
          axisLine: { lineStyle: { color: this.isDark ? '#303030' : '#d9d9d9' } }
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: this.isDark ? 'rgba(255,255,255,0.45)' : '#8c8c8c' },
          splitLine: { lineStyle: { color: this.isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0' } }
        },
        series: [
          {
            name: this.$t('dashboard.indicator.backtest.strategy'),
            type: 'line',
            data: equity,
            smooth: 0.4,
            symbol: 'none',
            sampling: 'lttb',
            lineStyle: { width: 2.5, color: mainColor },
            areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, gradientColor) }
          }
        ]
      }
      this.equityChart.setOption(option)
      window.addEventListener('resize', () => this.equityChart && this.equityChart.resize())
    }
  }
}
</script>

<style lang="less" scoped>
.backtest-run-viewer {
  :deep(.ant-modal-body) {
    padding: 16px;
    max-height: 70vh;
    overflow-y: auto;
  }
}

.metrics-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.metric-card {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 12px;
}
.metric-card.positive { border-color: rgba(82, 196, 26, 0.35); }
.metric-card.negative { border-color: rgba(245, 34, 45, 0.35); }
.metric-label { color: #8c8c8c; font-size: 12px; }
.metric-value { font-size: 18px; font-weight: 600; margin-top: 4px; }
.metric-amount { color: #8c8c8c; font-size: 12px; margin-top: 4px; }

.chart-section { margin-top: 8px; }
.chart-title { font-weight: 600; margin: 8px 0; color: #262626; }
.equity-chart { width: 100%; height: 280px; }
.trades-section { margin-top: 16px; }
.trade-time-text,
.trade-detail-text {
  color: inherit;
}
</style>

<style lang="less">
.backtest-run-viewer-wrap--dark {
  .ant-modal-content,
  .ant-modal-header,
  .ant-modal-body,
  .ant-modal-footer {
    background: #1f1f1f;
  }

  .ant-modal-header {
    border-bottom-color: #303030;
  }

  .ant-modal-title,
  .chart-title {
    color: rgba(255, 255, 255, 0.88);
  }

  .ant-modal-close {
    color: rgba(255, 255, 255, 0.55);
  }

  .metric-card {
    background: #141414;
    border-color: #303030;
  }

  .metric-label,
  .metric-amount {
    color: rgba(255, 255, 255, 0.45);
  }

  .metric-value {
    color: rgba(255, 255, 255, 0.88);
  }

  .ant-alert {
    background: rgba(23, 125, 220, 0.08);
    border-color: rgba(23, 125, 220, 0.24);
  }

  .ant-alert-warning {
    background: rgba(250, 173, 20, 0.12);
    border-color: rgba(250, 173, 20, 0.35);
  }

  .ant-alert-message,
  .ant-alert-description {
    color: rgba(255, 255, 255, 0.82);
  }

  .ant-table {
    background: transparent;
    color: rgba(255, 255, 255, 0.85);
  }

  .ant-table-thead > tr > th {
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.65);
    border-bottom-color: #303030;
  }

  .ant-table-tbody > tr > td {
    background: transparent;
    color: rgba(255, 255, 255, 0.85);
    border-bottom-color: #303030;
  }

  .ant-table-tbody > tr:hover > td {
    background: rgba(255, 255, 255, 0.04);
  }

  .ant-pagination-item {
    background: #1f1f1f;
    border-color: #434343;
  }

  .ant-pagination-item a,
  .ant-pagination-prev .ant-pagination-item-link,
  .ant-pagination-next .ant-pagination-item-link {
    color: rgba(255, 255, 255, 0.65);
    background: #1f1f1f;
    border-color: #434343;
  }
}
</style>

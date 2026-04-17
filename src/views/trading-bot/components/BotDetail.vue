<template>
  <div class="bot-detail" :class="{ 'theme-dark': isDark }" v-if="bot">
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
        <!-- 参数 Tab -->
        <a-tab-pane key="params" :tab="$t('trading-bot.tab.params')">
          <div v-if="activeTab === 'params'" class="params-panel">
            <div class="params-section">
              <div class="params-section__title">
                <a-icon type="setting" />
                <span>{{ $t('trading-bot.detail.basicConfig') }}</span>
              </div>
              <div class="params-grid">
                <div class="param-item">
                  <span class="param-label">{{ $t('trading-bot.wizard.symbol') }}</span>
                  <span class="param-value">{{ tc.symbol || '-' }}</span>
                </div>
                <div class="param-item">
                  <span class="param-label">{{ $t('trading-bot.wizard.marketType') }}</span>
                  <span class="param-value">
                    <a-tag :color="tc.market_type === 'swap' ? 'orange' : 'cyan'" size="small">
                      {{ tc.market_type === 'swap' ? $t('trading-bot.wizard.futures') : $t('trading-bot.wizard.spot') }}
                    </a-tag>
                  </span>
                </div>
                <div class="param-item">
                  <span class="param-label">{{ $t('trading-bot.wizard.timeframe') }}</span>
                  <span class="param-value">{{ tc.timeframe || '-' }}</span>
                </div>
                <div class="param-item" v-if="tc.market_type === 'swap'">
                  <span class="param-label">{{ $t('trading-bot.wizard.leverage') }}</span>
                  <span class="param-value highlight">{{ tc.leverage || 1 }}x</span>
                </div>
                <div class="param-item">
                  <span class="param-label">{{ capitalLabel }}</span>
                  <span class="param-value highlight">{{ formatNum(tc.initial_capital) }} USDT</span>
                </div>
                <div class="param-item" v-if="tc.order_mode">
                  <span class="param-label">{{ $t('trading-bot.grid.orderType') }}</span>
                  <span class="param-value">
                    <a-tag :color="tc.order_mode === 'maker' ? 'green' : 'blue'" size="small">
                      {{ tc.order_mode === 'maker' ? $t('trading-bot.grid.limitOrder') : $t('trading-bot.grid.marketOrder') }}
                    </a-tag>
                  </span>
                </div>
              </div>
            </div>

            <div class="params-section" v-if="displayStrategyItems.length">
              <div class="params-section__title">
                <a-icon type="sliders" />
                <span>{{ $t('trading-bot.wizard.strategyParams') }}</span>
              </div>
              <div class="params-grid">
                <div class="param-item" v-for="item in displayStrategyItems" :key="item.key">
                  <span class="param-label">{{ item.label }}</span>
                  <span class="param-value" :class="{ highlight: isNumeric(item.value) }">{{ item.value }}</span>
                </div>
              </div>
            </div>

            <div class="params-section" v-if="displayRiskItems.length">
              <div class="params-section__title">
                <a-icon type="safety-certificate" />
                <span>{{ $t('trading-bot.wizard.riskParams') }}</span>
              </div>
              <div class="params-grid">
                <div class="param-item" v-for="item in displayRiskItems" :key="item.key">
                  <span class="param-label">{{ item.label }}</span>
                  <span class="param-value highlight" :class="riskValueClass(item.key)">{{ item.value }}</span>
                </div>
              </div>
            </div>
          </div>
        </a-tab-pane>

        <!-- 预估挂单 Tab (仅网格) -->
        <a-tab-pane v-if="isGridBot" key="gridPreview" :tab="$t('trading-bot.tab.gridPreview')">
          <div v-if="activeTab === 'gridPreview'" class="grid-preview-panel">
            <!-- 概览卡片 -->
            <div class="grid-overview">
              <div class="grid-overview__item">
                <span class="ov-label">{{ $t('trading-bot.grid.upperPrice') }}</span>
                <span class="ov-value">{{ formatPrice(gp.upperPrice) }}</span>
              </div>
              <div class="grid-overview__item">
                <span class="ov-label">{{ $t('trading-bot.grid.lowerPrice') }}</span>
                <span class="ov-value">{{ formatPrice(gp.lowerPrice) }}</span>
              </div>
              <div class="grid-overview__item">
                <span class="ov-label">{{ $t('trading-bot.grid.gridCount') }}</span>
                <span class="ov-value">{{ gp.gridCount }}</span>
              </div>
              <div class="grid-overview__item">
                <span class="ov-label">{{ $t('trading-bot.grid.amountPerGrid') }}</span>
                <span class="ov-value">{{ formatNum(gp.amountPerGrid) }} USDT</span>
              </div>
              <div class="grid-overview__item">
                <span class="ov-label">{{ $t('trading-bot.grid.gridSpacing') }}</span>
                <span class="ov-value">{{ gridSpacingDisplay }}</span>
              </div>
              <div class="grid-overview__item">
                <span class="ov-label">{{ $t('trading-bot.grid.totalInvest') }}</span>
                <span class="ov-value highlight">{{ formatNum(gp.amountPerGrid * gp.gridCount) }} USDT</span>
              </div>
              <div class="grid-overview__item">
                <span class="ov-label">{{ $t('trading-bot.detail.gridProfitPerGrid') }}</span>
                <span class="ov-value highlight">~{{ formatUsdt(avgGridProfitUsdt) }} USDT</span>
              </div>
              <div class="grid-overview__item">
                <span class="ov-label">{{ $t('trading-bot.detail.gridProfitPct') }}</span>
                <span class="ov-value highlight">{{ gridProfitPctDisplay }}</span>
              </div>
            </div>

            <div class="grid-note">
              <a-icon type="info-circle" />
              <span>{{ $t('trading-bot.detail.gridNote') }}</span>
            </div>

            <!-- 左右两列：做多 | 做空 -->
            <div class="grid-orders-split">
              <div class="grid-orders-col grid-orders-col--long">
                <div class="grid-orders-col__header grid-orders-col__header--long">
                  <a-icon type="arrow-up" /> {{ $t('trading-bot.detail.gridLong') }}
                  <span class="grid-orders-col__count">{{ longOrders.length }}</span>
                </div>
                <div class="grid-orders-col__list">
                  <div
                    v-for="o in longOrders"
                    :key="'l-' + o.level"
                    class="grid-order-item grid-order-item--long"
                  >
                    <div class="grid-order-item__level">#{{ o.level }}</div>
                    <div class="grid-order-item__price">{{ formatPrice(o.price) }}</div>
                    <div class="grid-order-item__target" v-if="o.targetPrice">
                      → {{ formatPrice(o.targetPrice) }}
                    </div>
                    <div class="grid-order-item__profit" v-if="o.profitUsdt > 0">
                      +{{ formatUsdt(o.profitUsdt) }}
                    </div>
                  </div>
                  <div v-if="!longOrders.length" class="grid-orders-col__empty">-</div>
                </div>
              </div>

              <!-- 中间分隔（参考价格线） -->
              <div v-if="gp.gridDirection === 'neutral'" class="grid-orders-entry">
                <div class="grid-orders-entry__badge">
                  <a-icon type="aim" />
                </div>
                <div class="grid-orders-entry__price">{{ formatPrice(gridRefPrice) }}</div>
                <div class="grid-orders-entry__label">{{ entryOrder ? $t('trading-bot.detail.gridEntry') : $t('trading-bot.detail.gridRefPrice') }}</div>
              </div>

              <div class="grid-orders-col grid-orders-col--short">
                <div class="grid-orders-col__header grid-orders-col__header--short">
                  <a-icon type="arrow-down" /> {{ $t('trading-bot.detail.gridShort') }}
                  <span class="grid-orders-col__count">{{ shortOrders.length }}</span>
                </div>
                <div class="grid-orders-col__list">
                  <div
                    v-for="o in shortOrders"
                    :key="'s-' + o.level"
                    class="grid-order-item grid-order-item--short"
                  >
                    <div class="grid-order-item__level">#{{ o.level }}</div>
                    <div class="grid-order-item__price">{{ formatPrice(o.price) }}</div>
                    <div class="grid-order-item__target" v-if="o.targetPrice">
                      → {{ formatPrice(o.targetPrice) }}
                    </div>
                    <div class="grid-order-item__profit" v-if="o.profitUsdt > 0">
                      +{{ formatUsdt(o.profitUsdt) }}
                    </div>
                  </div>
                  <div v-if="!shortOrders.length" class="grid-orders-col__empty">-</div>
                </div>
              </div>
            </div>

            <!-- K线 + 网格可视化 -->
            <div class="grid-visual" v-if="gridPriceLevels.length > 0 && gridPriceLevels.length <= 60">
              <div class="grid-visual__title">
                <a-icon type="bar-chart" />
                <span>{{ $t('trading-bot.detail.gridVisual') }}</span>
                <span v-if="klineLoading" class="grid-visual__loading">
                  <a-icon type="loading" /> K线加载中...
                </span>
              </div>
              <div class="grid-visual__chart" ref="gridChartWrap">
                <canvas ref="klineCanvas" class="grid-kline-canvas"></canvas>
                <div
                  v-for="(lv, idx) in gridPriceLevels"
                  :key="'line-' + idx"
                  class="grid-line"
                  :class="{
                    'grid-line--buy': lv.side === 'long',
                    'grid-line--sell': lv.side === 'short',
                    'grid-line--mid': lv.side === 'entry'
                  }"
                  :style="{ bottom: lv.pct + '%' }"
                  :title="'#' + idx + ' ' + formatPrice(lv.price)"
                >
                  <div class="grid-line__bar"></div>
                  <div class="grid-line__price">{{ formatPrice(lv.price) }}</div>
                </div>
              </div>
            </div>
          </div>
        </a-tab-pane>

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
import request from '@/utils/request'

const TYPE_META = {
  grid: { icon: 'bar-chart', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  martingale: { icon: 'fall', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  trend: { icon: 'stock', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  dca: { icon: 'fund', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  arbitrage: { icon: 'swap', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  custom: { icon: 'code', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' }
}

const PARAM_LABEL_MAP = {
  upperPrice: 'trading-bot.grid.upperPrice',
  lowerPrice: 'trading-bot.grid.lowerPrice',
  gridCount: 'trading-bot.grid.gridCount',
  amountPerGrid: 'trading-bot.grid.amountPerGrid',
  gridMode: 'trading-bot.grid.mode',
  gridDirection: 'trading-bot.grid.direction',
  referencePrice: 'trading-bot.detail.gridRefPrice',
  orderMode: 'trading-bot.grid.orderType',
  initialAmount: 'trading-bot.martingale.initialAmount',
  multiplier: 'trading-bot.martingale.multiplier',
  maxLayers: 'trading-bot.martingale.maxLayers',
  priceDropPct: 'trading-bot.martingale.priceDropPct',
  takeProfitPct: 'trading-bot.martingale.takeProfitPct',
  stopLossPct: 'trading-bot.risk.stopLossPct',
  direction: 'trading-bot.martingale.direction',
  maPeriod: 'trading-bot.trend.maPeriod',
  maType: 'trading-bot.trend.maType',
  confirmBars: 'trading-bot.trend.confirmBars',
  positionPct: 'trading-bot.trend.positionPct',
  amountEach: 'trading-bot.dca.amountEach',
  frequency: 'trading-bot.dca.frequency',
  totalBudget: 'trading-bot.dca.totalBudget',
  dipBuyEnabled: 'trading-bot.dca.dipBuy',
  dipThreshold: 'trading-bot.dca.dipThreshold'
}

const VALUE_DISPLAY_MAP = {
  gridMode: { arithmetic: 'trading-bot.grid.arithmetic', geometric: 'trading-bot.grid.geometric' },
  gridDirection: { neutral: 'trading-bot.grid.neutral', long: 'trading-bot.grid.long', short: 'trading-bot.grid.short' },
  orderMode: { maker: 'trading-bot.grid.limitOrder', market: 'trading-bot.grid.marketOrder' }
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
      activeTab: 'params',
      klineData: [],
      klineLoading: false
    }
  },
  computed: {
    tc () { return this.bot?.trading_config || {} },
    botParams () { return this.tc.bot_params || {} },
    botDisplay () { return this.bot?.bot_display || {} },
    isMartingaleBot () { return (this.bot?.bot_type || this.tc.bot_type) === 'martingale' },
    displayStrategyItems () {
      const items = Array.isArray(this.botDisplay?.strategy_params) ? this.botDisplay.strategy_params : null
      if (items && items.length) {
        return items.map(item => ({
          key: item.key,
          label: item.label_key ? this.$t(item.label_key) : this.paramLabel(item.key),
          value: this.formatDisplayItem(item)
        }))
      }
      return Object.entries(this.displayBotParams).map(([key, val]) => ({
        key,
        label: this.paramLabel(key),
        value: this.formatParamValue(key, val)
      }))
    },
    displayBotParams () {
      const skip = new Set(['orderMode', 'timeframe'])
      const out = {}
      for (const [k, v] of Object.entries(this.botParams)) {
        if (!skip.has(k) && v !== null && v !== undefined && v !== '') out[k] = v
      }
      return out
    },
    capitalLabel () {
      return this.botDisplay?.capital_label_key
        ? this.$t(this.botDisplay.capital_label_key)
        : this.$t('trading-bot.wizard.initialCapital')
    },
    displayRiskItems () {
      const items = Array.isArray(this.botDisplay?.risk_params) ? this.botDisplay.risk_params : null
      if (items && items.length) {
        return items.map(item => ({
          key: item.key,
          label: item.label_key ? this.$t(item.label_key) : this.paramLabel(item.key),
          value: this.formatDisplayItem(item)
        }))
      }
      const fallback = []
      if (!this.isMartingaleBot && this.tc.stop_loss_pct) fallback.push({ key: 'stopLossPct', label: this.$t('trading-bot.risk.stopLossPct'), value: `${this.tc.stop_loss_pct}%` })
      if (!this.isMartingaleBot && this.tc.take_profit_pct) fallback.push({ key: 'takeProfitPct', label: this.$t('trading-bot.risk.takeProfitPct'), value: `${this.tc.take_profit_pct}%` })
      if (!this.isMartingaleBot && this.tc.max_position) fallback.push({ key: 'maxPosition', label: this.$t('trading-bot.risk.maxPosition'), value: `${this.formatNum(this.tc.max_position)} USDT` })
      if (this.tc.max_daily_loss) fallback.push({ key: 'maxDailyLoss', label: this.isMartingaleBot ? this.$t('trading-bot.martingale.maxDailyLossAdvanced') : this.$t('trading-bot.risk.maxDailyLoss'), value: `${this.formatNum(this.tc.max_daily_loss)} USDT` })
      return fallback
    },
    isGridBot () { return (this.bot?.bot_type || this.tc.bot_type) === 'grid' },
    gp () {
      const bp = this.botParams
      return {
        upperPrice: parseFloat(bp.upperPrice) || 0,
        lowerPrice: parseFloat(bp.lowerPrice) || 0,
        gridCount: parseInt(bp.gridCount) || 10,
        amountPerGrid: parseFloat(bp.amountPerGrid) || 0,
        gridMode: bp.gridMode || 'arithmetic',
        gridDirection: bp.gridDirection || 'neutral'
      }
    },
    gridSpacingDisplay () {
      const { upperPrice, lowerPrice, gridCount, gridMode } = this.gp
      if (!upperPrice || !lowerPrice || !gridCount) return '-'
      if (gridMode === 'geometric' && lowerPrice > 0) {
        const ratio = Math.pow(upperPrice / lowerPrice, 1.0 / gridCount)
        return ((ratio - 1) * 100).toFixed(2) + '%'
      }
      return this.formatPrice((upperPrice - lowerPrice) / gridCount)
    },
    gridRefPrice () {
      const fixed = parseFloat(this.botParams.referencePrice)
      if (fixed > 0) return fixed
      const state = (this.tc.script_runtime_state || {}).params || {}
      if (state.prev_price && state.prev_price > 0) return state.prev_price
      const { upperPrice, lowerPrice } = this.gp
      return (upperPrice + lowerPrice) / 2
    },
    gridPriceLevels () {
      const { upperPrice, lowerPrice, gridCount, gridMode, gridDirection } = this.gp
      if (!upperPrice || !lowerPrice || !gridCount || upperPrice <= lowerPrice) return []
      const levels = []
      const ref = this.gridRefPrice
      for (let i = 0; i <= gridCount; i++) {
        let price
        if (gridMode === 'geometric' && lowerPrice > 0) {
          const r = Math.pow(upperPrice / lowerPrice, 1.0 / gridCount)
          price = lowerPrice * Math.pow(r, i)
        } else {
          price = lowerPrice + ((upperPrice - lowerPrice) / gridCount) * i
        }
        let side = ''
        if (gridDirection === 'long') side = 'long'
        else if (gridDirection === 'short') side = 'short'
        else {
          side = price < ref ? 'long' : price > ref ? 'short' : 'entry'
        }
        levels.push({ price, pct: ((price - lowerPrice) / (upperPrice - lowerPrice)) * 100, side })
      }
      return levels
    },
    gridOrders () {
      const levels = this.gridPriceLevels
      const { amountPerGrid, gridDirection } = this.gp
      if (levels.length < 2) return []
      const ref = this.gridRefPrice
      const orders = []
      for (let i = 0; i < levels.length; i++) {
        const lv = levels[i]
        let side, trigger, targetPrice, profitUsdt
        if (gridDirection === 'long') {
          side = 'long'; trigger = this.$t('trading-bot.detail.triggerDrop')
          targetPrice = i < levels.length - 1 ? levels[i + 1].price : null
          profitUsdt = targetPrice ? amountPerGrid * ((targetPrice - lv.price) / lv.price) : 0
        } else if (gridDirection === 'short') {
          side = 'short'; trigger = this.$t('trading-bot.detail.triggerRise')
          targetPrice = i > 0 ? levels[i - 1].price : null
          profitUsdt = targetPrice ? amountPerGrid * ((lv.price - targetPrice) / targetPrice) : 0
        } else {
          if (lv.price < ref) {
            side = 'long'; trigger = this.$t('trading-bot.detail.triggerDrop')
            targetPrice = i + 1 < levels.length ? levels[i + 1].price : null
            profitUsdt = targetPrice ? amountPerGrid * ((targetPrice - lv.price) / lv.price) : 0
          } else if (lv.price > ref) {
            side = 'short'; trigger = this.$t('trading-bot.detail.triggerRise')
            targetPrice = i - 1 >= 0 ? levels[i - 1].price : null
            profitUsdt = targetPrice ? amountPerGrid * ((lv.price - targetPrice) / targetPrice) : 0
          } else {
            side = 'entry'; trigger = this.$t('trading-bot.detail.triggerEntry')
            targetPrice = null; profitUsdt = 0
          }
        }
        orders.push({ level: i, price: lv.price, side, trigger, targetPrice, profitUsdt })
      }
      return orders
    },
    longOrders () { return this.gridOrders.filter(o => o.side === 'long').sort((a, b) => b.price - a.price) },
    shortOrders () { return this.gridOrders.filter(o => o.side === 'short').sort((a, b) => a.price - b.price) },
    entryOrder () { return this.gridOrders.find(o => o.side === 'entry') || null },
    avgGridProfitUsdt () {
      const orders = this.gridOrders.filter(o => o.profitUsdt > 0)
      if (!orders.length) return 0
      return orders.reduce((s, o) => s + o.profitUsdt, 0) / orders.length
    },
    gridProfitPctDisplay () {
      const amountPerGrid = parseFloat(this.gp.amountPerGrid) || 0
      const orders = this.gridOrders.filter(o => o.profitUsdt > 0)
      if (!amountPerGrid || !orders.length) return '-'
      const avgPct = orders.reduce((sum, o) => sum + (o.profitUsdt / amountPerGrid) * 100, 0) / orders.length
      return `${avgPct.toFixed(2)}%`
    },
    botIcon () { return (TYPE_META[this.bot?.bot_type] || TYPE_META.custom).icon },
    botGradient () { return (TYPE_META[this.bot?.bot_type] || TYPE_META.custom).gradient },
    botTypeName () { return this.$t(`trading-bot.type.${this.bot?.bot_type}`) || this.bot?.bot_type },
    statusText () {
      const map = { running: this.$t('trading-bot.status.running'), stopped: this.$t('trading-bot.status.stopped'), error: this.$t('trading-bot.status.error') }
      return map[this.bot?.status] || this.$t('trading-bot.status.stopped')
    },
    exchangeName () {
      const id = this.bot?.exchange_config?.exchange_id
      return { binance: 'Binance', bybit: 'Bybit', gate: 'Gate.io', okx: 'OKX', htx: 'HTX' }[id] || id
    }
  },
  methods: {
    formatDisplayItem (item) {
      const valueType = item?.value_type || 'text'
      const value = item?.value
      if (valueType === 'enum' && item?.value_key) return this.$t(item.value_key)
      if (valueType === 'bool') return value ? this.$t('trading-bot.common.enabled') : this.$t('trading-bot.common.disabled')
      if (valueType === 'percent') return `${this.formatNum(value)}%`
      if (valueType === 'usdt') return `${this.formatNum(value)} USDT`
      if (valueType === 'number' && typeof value === 'number') return this.formatNum(value)
      return String(value)
    },
    riskValueClass (key) {
      if (key === 'takeProfitPct') return 'success'
      if (key === 'stopLossPct' || key === 'maxDailyLoss') return 'danger'
      return ''
    },
    formatNum (v) {
      if (v === null || v === undefined) return '-'
      const n = parseFloat(v)
      if (isNaN(n)) return v
      return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    formatUsdt (v) {
      const n = parseFloat(v)
      if (isNaN(n)) return '0.00'
      if (Math.abs(n) < 0.01) return n.toFixed(4)
      return n.toFixed(2)
    },
    formatPrice (v) {
      if (v === null || v === undefined) return '-'
      const n = parseFloat(v)
      if (isNaN(n)) return v
      if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      if (n >= 1) return n.toFixed(4)
      return n.toPrecision(6)
    },
    isNumeric (v) { return typeof v === 'number' || (typeof v === 'string' && !isNaN(parseFloat(v)) && isFinite(v)) },
    paramLabel (key) {
      if (this.isMartingaleBot) {
        const martingaleLabels = {
          initialAmount: this.$t('trading-bot.martingale.initialAmountAuto'),
          priceDropPct: this.$t('trading-bot.martingale.priceDropTrigger'),
          takeProfitPct: this.$t('trading-bot.martingale.avgEntryTakeProfit'),
          stopLossPct: this.$t('trading-bot.martingale.avgEntryStopLoss')
        }
        if (martingaleLabels[key]) return martingaleLabels[key]
      }
      const i18nKey = PARAM_LABEL_MAP[key]
      if (i18nKey) return this.$t(i18nKey)
      return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
    },
    formatParamValue (key, val) {
      const displayMap = VALUE_DISPLAY_MAP[key]
      if (displayMap && displayMap[val]) return this.$t(displayMap[val])
      if (key === 'direction') {
        if (this.bot?.bot_type === 'trend') {
          return { long: this.$t('trading-bot.trend.longOnly'), short: this.$t('trading-bot.trend.shortOnly'), both: this.$t('trading-bot.trend.bothSides') }[val] || String(val)
        }
        return { long: this.$t('trading-bot.martingale.long'), short: this.$t('trading-bot.martingale.short') }[val] || String(val)
      }
      if (key === 'frequency') {
        return {
          every_bar: this.$t('trading-bot.dca.everyBar'),
          hourly: this.$t('trading-bot.dca.hourly'),
          '4h': '4H',
          daily: this.$t('trading-bot.dca.daily'),
          weekly: this.$t('trading-bot.dca.weekly'),
          biweekly: this.$t('trading-bot.dca.biweekly'),
          monthly: this.$t('trading-bot.dca.monthly')
        }[val] || String(val)
      }
      if (val === 'true' || val === 'false') return val === 'true' ? this.$t('trading-bot.common.enabled') : this.$t('trading-bot.common.disabled')
      if (typeof val === 'boolean') return val ? this.$t('trading-bot.common.enabled') : this.$t('trading-bot.common.disabled')
      if (['priceDropPct', 'takeProfitPct', 'stopLossPct', 'positionPct', 'dipThreshold'].includes(key)) {
        return `${this.formatNum(val)}%`
      }
      if (['initialAmount', 'amountEach', 'amountPerGrid', 'referencePrice', 'totalBudget'].includes(key)) {
        return `${this.formatNum(val)} USDT`
      }
      if (typeof val === 'number') return this.formatNum(val)
      return String(val)
    },
    fetchKlineForGrid () {
      const symbol = this.tc.symbol
      if (!symbol) return
      this.klineLoading = true
      request({
        url: '/api/indicator/kline',
        method: 'get',
        params: { market: 'Crypto', symbol, timeframe: '1H', limit: 200 }
      }).then(res => {
        if (res && res.code === 1 && Array.isArray(res.data)) {
          this.klineData = res.data
        }
      }).catch(() => {}).finally(() => { this.klineLoading = false })
    },
    drawKlineBackground () {
      this.$nextTick(() => {
        const canvas = this.$refs.klineCanvas
        const wrap = this.$refs.gridChartWrap
        if (!canvas || !wrap || !this.klineData.length) return

        const rect = wrap.getBoundingClientRect()
        if (rect.width < 10 || rect.height < 10) return
        const dpr = window.devicePixelRatio || 1
        const W = rect.width
        const H = rect.height
        canvas.width = W * dpr
        canvas.height = H * dpr
        canvas.style.width = W + 'px'
        canvas.style.height = H + 'px'

        const ctx = canvas.getContext('2d')
        ctx.scale(dpr, dpr)
        ctx.clearRect(0, 0, W, H)

        const { upperPrice, lowerPrice } = this.gp
        if (!upperPrice || !lowerPrice || upperPrice <= lowerPrice) return

        const priceRange = upperPrice - lowerPrice
        const margin = priceRange * 0.05
        const visLow = lowerPrice - margin
        const visHigh = upperPrice + margin
        const visRange = visHigh - visLow

        const bars = this.klineData.filter(k => k.high >= visLow && k.low <= visHigh)
        if (!bars.length) return

        const padL = 8; const padR = 72; const padT = 6; const padB = 6
        const drawW = W - padL - padR
        const drawH = H - padT - padB
        const barW = Math.max(1, Math.min(8, (drawW / bars.length) * 0.7))
        const gap = drawW / bars.length
        const toY = (p) => padT + drawH - ((p - visLow) / visRange) * drawH

        const dk = this.isDark
        const cBull = dk ? 'rgba(82,196,26,0.4)' : 'rgba(82,196,26,0.3)'
        const cBear = dk ? 'rgba(245,34,45,0.4)' : 'rgba(245,34,45,0.3)'
        const wBull = dk ? 'rgba(82,196,26,0.3)' : 'rgba(82,196,26,0.2)'
        const wBear = dk ? 'rgba(245,34,45,0.3)' : 'rgba(245,34,45,0.2)'

        for (let i = 0; i < bars.length; i++) {
          const k = bars[i]
          const cx = padL + i * gap + gap / 2
          const bull = k.close >= k.open
          const bTop = toY(Math.max(k.open, k.close))
          const bBot = toY(Math.min(k.open, k.close))
          const bH = Math.max(0.5, bBot - bTop)
          ctx.beginPath()
          ctx.strokeStyle = bull ? wBull : wBear
          ctx.lineWidth = 0.5
          ctx.moveTo(cx, toY(k.high))
          ctx.lineTo(cx, toY(k.low))
          ctx.stroke()
          ctx.fillStyle = bull ? cBull : cBear
          ctx.fillRect(cx - barW / 2, bTop, barW, bH)
        }
      })
    }
  },
  watch: {
    bot () {
      this.activeTab = 'params'
      this.klineData = []
    },
    activeTab (val) {
      if (val === 'gridPreview' && this.isGridBot && !this.klineData.length) {
        this.$nextTick(() => this.fetchKlineForGrid())
      }
      if (val === 'gridPreview' && this.klineData.length) {
        setTimeout(() => this.drawKlineBackground(), 200)
      }
    },
    klineData () {
      setTimeout(() => this.drawKlineBackground(), 300)
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
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  .header-left { display: flex; align-items: center; gap: 14px; flex: 1; }
  .type-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 22px; flex-shrink: 0; }
  .header-info h3 { font-size: 18px; font-weight: 700; margin: 0 0 6px; color: #262626; }
  .header-tags { display: flex; gap: 6px; flex-wrap: wrap; }
  .header-actions { display: flex; gap: 8px; flex-shrink: 0; }
}

/* ===================== 参数面板 ===================== */
.params-panel { padding: 4px 0; }
.params-section {
  margin-bottom: 20px;
  &__title {
    display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600;
    color: #262626; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;
    .anticon { color: #667eea; font-size: 16px; }
  }
}
.params-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.param-item {
  display: flex; flex-direction: column; gap: 4px; padding: 10px 14px;
  background: #fafafa; border-radius: 8px; border: 1px solid #f0f0f0;
  .param-label { font-size: 12px; color: #8c8c8c; line-height: 1.4; }
  .param-value { font-size: 14px; font-weight: 500; color: #262626;
    &.highlight { font-weight: 700; color: #1890ff; }
    &.danger { color: #f5222d; }
    &.success { color: #52c41a; }
  }
}

/* ===================== 网格预览 ===================== */
.grid-preview-panel { padding: 4px 0; }
.grid-overview {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; margin-bottom: 20px;
  &__item {
    display: flex; flex-direction: column; gap: 4px; padding: 12px 14px;
    background: linear-gradient(135deg, rgba(102,126,234,0.04) 0%, rgba(118,75,162,0.04) 100%);
    border: 1px solid rgba(102,126,234,0.12); border-radius: 8px;
    .ov-label { font-size: 12px; color: #8c8c8c; }
    .ov-value { font-size: 15px; font-weight: 600; color: #262626; &.highlight { color: #667eea; } }
  }
}
.grid-note {
  display: flex; align-items: flex-start; gap: 8px; margin-bottom: 16px; padding: 10px 14px;
  background: rgba(24,144,255,0.04); border: 1px dashed rgba(24,144,255,0.2); border-radius: 8px;
  font-size: 12px; color: #8c8c8c; line-height: 1.6;
  .anticon { color: #1890ff; margin-top: 2px; flex-shrink: 0; }
}

/* -------- 左右两列挂单 -------- */
.grid-orders-split {
  display: flex; gap: 16px; margin-bottom: 20px;
}
.grid-orders-col {
  flex: 1; min-width: 0; border-radius: 10px; overflow: hidden;
  border: 1px solid #f0f0f0;
  &__header {
    display: flex; align-items: center; gap: 6px; padding: 10px 14px;
    font-size: 14px; font-weight: 600;
  }
  &__header--long { background: rgba(82,196,26,0.06); color: #52c41a; border-bottom: 1px solid rgba(82,196,26,0.15); }
  &__header--short { background: rgba(245,34,45,0.06); color: #f5222d; border-bottom: 1px solid rgba(245,34,45,0.15); }
  &__count {
    margin-left: auto; background: rgba(0,0,0,0.06); border-radius: 10px; padding: 0 8px;
    font-size: 12px; color: #8c8c8c; font-weight: 500;
  }
  &__list { max-height: 380px; overflow-y: auto; padding: 4px 0; }
  &__empty { text-align: center; padding: 24px; color: #bfbfbf; }
}
.grid-order-item {
  display: flex; align-items: center; gap: 8px; padding: 7px 14px; font-size: 13px;
  border-bottom: 1px solid rgba(0,0,0,0.03);
  &:last-child { border-bottom: none; }
  &__level { font-weight: 600; color: #bfbfbf; min-width: 32px; font-size: 12px; }
  &__price { font-family: 'SF Mono','Monaco','Consolas',monospace; font-weight: 600; }
  &__target { color: #8c8c8c; font-size: 12px; font-family: 'SF Mono','Monaco','Consolas',monospace; }
  &__profit { margin-left: auto; font-weight: 600; font-size: 12px; }
  &--long &__price { color: #389e0d; }
  &--long &__profit { color: #52c41a; }
  &--short &__price { color: #cf1322; }
  &--short &__profit { color: #52c41a; }
}
.grid-orders-entry {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; padding: 0 8px; flex-shrink: 0;
  &__badge {
    width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #1890ff, #667eea); color: #fff; font-size: 18px;
  }
  &__price { font-family: 'SF Mono','Monaco','Consolas',monospace; font-weight: 700; font-size: 13px; color: #1890ff; }
  &__label { font-size: 11px; color: #8c8c8c; }
}

/* -------- K线可视化 -------- */
.grid-visual {
  margin-top: 16px;
  &__title {
    display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600;
    color: #262626; margin-bottom: 12px;
    .anticon { color: #667eea; }
  }
  &__chart {
    position: relative; height: 400px; max-height: 50vh;
    background: linear-gradient(180deg, rgba(245,34,45,0.02) 0%, rgba(82,196,26,0.02) 100%);
    border: 1px solid #f0f0f0; border-radius: 8px; padding: 8px 80px 8px 12px; overflow: hidden;
  }
  &__loading { font-size: 12px; color: #8c8c8c; font-weight: 400; margin-left: 8px; }
}
.grid-kline-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }
.grid-line {
  position: absolute; left: 12px; right: 12px; height: 0; z-index: 1;
  &__bar { width: 100%; height: 1px; background: rgba(102,126,234,0.15); }
  &__price {
    position: absolute; right: 0; top: -8px; font-size: 10px;
    font-family: 'SF Mono','Monaco','Consolas',monospace; color: #8c8c8c;
    white-space: nowrap; background: rgba(255,255,255,0.85); padding: 0 3px; border-radius: 2px;
  }
  &--buy &__bar { background: rgba(82,196,26,0.55); }
  &--buy &__price { color: #52c41a; }
  &--sell &__bar { background: rgba(245,34,45,0.55); }
  &--sell &__price { color: #f5222d; }
  &--mid &__bar { height: 2px; background: #1890ff; }
  &--mid &__price { color: #1890ff; font-weight: 700; }
}

/* ===================== 暗黑模式 ===================== */
.theme-dark {
  .detail-header-card, .detail-tabs-card { background: #1f1f1f; box-shadow: 0 2px 12px rgba(0,0,0,0.3); }
  .header-info h3 { color: #e8e8e8; }
  .params-section__title { color: #d9d9d9; border-bottom-color: #303030; }
  .param-item { background: #141414; border-color: #303030;
    .param-label { color: #8c8c8c; }
    .param-value { color: #e8e8e8; }
  }
  .grid-overview__item {
    background: linear-gradient(135deg, rgba(102,126,234,0.08) 0%, rgba(118,75,162,0.08) 100%);
    border-color: rgba(102,126,234,0.2);
    .ov-label { color: #8c8c8c; }
    .ov-value { color: #e8e8e8; }
  }
  .grid-note { background: rgba(24,144,255,0.06); border-color: rgba(24,144,255,0.15); color: #8c8c8c; }
  .grid-orders-col { border-color: #303030; }
  .grid-orders-col__header--long { background: rgba(82,196,26,0.1); border-bottom-color: rgba(82,196,26,0.2); }
  .grid-orders-col__header--short { background: rgba(245,34,45,0.1); border-bottom-color: rgba(245,34,45,0.2); }
  .grid-orders-col__count { background: rgba(255,255,255,0.06); color: #8c8c8c; }
  .grid-order-item { border-bottom-color: rgba(255,255,255,0.04); }
  .grid-order-item__level { color: #595959; }
  .grid-order-item__target { color: #595959; }
  .grid-order-item--long .grid-order-item__price { color: #73d13d; }
  .grid-order-item--short .grid-order-item__price { color: #ff4d4f; }
  .grid-orders-entry__price { color: #40a9ff; }
  .grid-orders-entry__label { color: #595959; }
  .grid-visual__title { color: #d9d9d9; }
  .grid-visual__chart { background: rgba(255,255,255,0.02); border-color: #303030; }
  .grid-line__price { background: rgba(20,20,20,0.88); color: #8c8c8c; }
  .grid-line--buy .grid-line__price { color: #73d13d; }
  .grid-line--sell .grid-line__price { color: #ff4d4f; }
  .grid-line--mid .grid-line__price { color: #40a9ff; }
}
</style>

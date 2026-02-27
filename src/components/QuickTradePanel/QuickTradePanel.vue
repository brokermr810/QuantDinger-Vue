<template>
  <a-drawer
    :title="null"
    :width="380"
    :visible="visible"
    :closable="false"
    :bodyStyle="{ padding: 0 }"
    :maskStyle="{ background: 'rgba(0,0,0,0.45)' }"
    @close="handleClose"
    class="quick-trade-drawer"
    :class="{ 'theme-dark': isDark }"
  >
    <!-- Header -->
    <div class="qt-header">
      <div class="qt-header-left">
        <a-icon type="thunderbolt" theme="filled" class="qt-icon" />
        <span class="qt-header-title">{{ $t('quickTrade.title') }}</span>
      </div>
      <a-icon type="close" class="qt-close" @click="handleClose" />
    </div>

    <!-- Symbol & Price Bar -->
    <div class="qt-symbol-bar">
      <div class="qt-symbol-info">
        <span class="qt-symbol-name">{{ symbol }}</span>
        <a-tag v-if="presetSide" :color="presetSide === 'buy' ? '#52c41a' : '#f5222d'" size="small">
          {{ presetSide === 'buy' ? $t('quickTrade.long') : $t('quickTrade.short') }}
        </a-tag>
      </div>
      <div class="qt-price-display" :class="priceChangeClass">
        <span class="qt-current-price">${{ formatPrice(currentPrice) }}</span>
      </div>
    </div>

    <!-- Credential Selector -->
    <div class="qt-section">
      <div class="qt-label">{{ $t('quickTrade.exchange') }} <span class="qt-crypto-hint">{{ $t('quickTrade.cryptoOnly') }}</span></div>
      <a-select
        v-model="selectedCredentialId"
        :placeholder="$t('quickTrade.selectExchange')"
        style="width: 100%"
        @change="onCredentialChange"
        :loading="credLoading"
        :notFoundContent="$t('quickTrade.noExchange')"
      >
        <a-select-option v-for="c in credentials" :key="c.id" :value="c.id">
          <span style="text-transform: capitalize;">{{ c.exchange_id || c.name }}</span>
          <a-tag v-if="c.market_type" size="small" style="margin-left: 6px;">{{ c.market_type }}</a-tag>
        </a-select-option>
      </a-select>
      <!-- Balance -->
      <div class="qt-balance" v-if="balance.available > 0">
        <span class="qt-balance-label">{{ $t('quickTrade.available') }}:</span>
        <span class="qt-balance-value">${{ formatPrice(balance.available) }}</span>
      </div>
    </div>

    <!-- Direction Toggle -->
    <div class="qt-section">
      <div class="qt-direction-toggle">
        <div
          class="qt-dir-btn qt-dir-long"
          :class="{ active: side === 'buy' }"
          @click="side = 'buy'"
        >
          <a-icon type="arrow-up" /> {{ $t('quickTrade.long') }}
        </div>
        <div
          class="qt-dir-btn qt-dir-short"
          :class="{ active: side === 'sell' }"
          @click="side = 'sell'"
        >
          <a-icon type="arrow-down" /> {{ $t('quickTrade.short') }}
        </div>
      </div>
    </div>

    <!-- Order Type -->
    <div class="qt-section">
      <a-radio-group v-model="orderType" button-style="solid" size="small" style="width: 100%;">
        <a-radio-button value="market" style="width: 50%; text-align: center;">
          {{ $t('quickTrade.market') }}
        </a-radio-button>
        <a-radio-button value="limit" style="width: 50%; text-align: center;">
          {{ $t('quickTrade.limit') }}
        </a-radio-button>
      </a-radio-group>
    </div>

    <!-- Limit Price -->
    <div class="qt-section" v-if="orderType === 'limit'">
      <div class="qt-label">{{ $t('quickTrade.limitPrice') }}</div>
      <a-input-number
        v-model="limitPrice"
        :min="0"
        :step="priceStep"
        :precision="pricePrecision"
        style="width: 100%"
        :placeholder="$t('quickTrade.enterPrice')"
      />
    </div>

    <!-- Amount (USDT) -->
    <div class="qt-section">
      <div class="qt-label">{{ $t('quickTrade.amount') }} (USDT)</div>
      <a-input-number
        v-model="amount"
        :min="1"
        :step="10"
        :precision="2"
        style="width: 100%"
        :placeholder="$t('quickTrade.enterAmount')"
      />
      <div class="qt-quick-amounts">
        <a-button
          v-for="pct in quickAmountPcts"
          :key="pct"
          size="small"
          @click="setAmountByPercent(pct)"
          :disabled="balance.available <= 0"
        >
          {{ pct }}%
        </a-button>
      </div>
    </div>

    <!-- Leverage (futures only) -->
    <div class="qt-section" v-if="marketType !== 'spot'">
      <div class="qt-label">{{ $t('quickTrade.leverage') }}</div>
      <div class="qt-leverage-row">
        <a-slider
          v-model="leverage"
          :min="1"
          :max="125"
          :marks="leverageMarks"
          :tipFormatter="v => v + 'x'"
          style="flex: 1; margin-right: 12px;"
        />
        <a-input-number
          v-model="leverage"
          :min="1"
          :max="125"
          :formatter="v => `${v}x`"
          :parser="v => v.replace('x', '')"
          style="width: 80px"
        />
      </div>
    </div>

    <!-- TP / SL (optional) -->
    <a-collapse :bordered="false" style="background: transparent; margin: 0 16px;">
      <a-collapse-panel :header="$t('quickTrade.tpsl')" key="tpsl" :style="collapseStyle">
        <div class="qt-tpsl-row">
          <div class="qt-tpsl-item">
            <span class="qt-label" style="color: #52c41a;">{{ $t('quickTrade.tp') }}</span>
            <a-input-number
              v-model="tpPrice"
              :min="0"
              :step="priceStep"
              :precision="pricePrecision"
              style="width: 100%"
              :placeholder="$t('quickTrade.tpPlaceholder')" />
          </div>
          <div class="qt-tpsl-item">
            <span class="qt-label" style="color: #f5222d;">{{ $t('quickTrade.sl') }}</span>
            <a-input-number
              v-model="slPrice"
              :min="0"
              :step="priceStep"
              :precision="pricePrecision"
              style="width: 100%"
              :placeholder="$t('quickTrade.slPlaceholder')" />
          </div>
        </div>
      </a-collapse-panel>
    </a-collapse>

    <!-- Submit Button -->
    <div class="qt-submit-section">
      <a-button
        :type="side === 'buy' ? 'primary' : 'danger'"
        size="large"
        block
        :loading="submitting"
        :disabled="!canSubmit"
        @click="handleSubmit"
        class="qt-submit-btn"
        :class="[side === 'buy' ? 'qt-btn-long' : 'qt-btn-short']"
      >
        <a-icon :type="side === 'buy' ? 'arrow-up' : 'arrow-down'" />
        {{ side === 'buy' ? $t('quickTrade.buyLong') : $t('quickTrade.sellShort') }}
        {{ symbol }}
      </a-button>
    </div>

    <!-- Current Position (if any) -->
    <div class="qt-position-section" v-if="currentPosition">
      <div class="qt-section-header">
        <a-icon type="wallet" /> {{ $t('quickTrade.currentPosition') }}
      </div>
      <div class="qt-position-card" :class="currentPosition.side">
        <div class="qt-pos-row">
          <span>{{ $t('quickTrade.side') }}</span>
          <a-tag :color="currentPosition.side === 'long' ? '#52c41a' : '#f5222d'" size="small">
            {{ currentPosition.side === 'long' ? $t('quickTrade.long') : $t('quickTrade.short') }}
          </a-tag>
        </div>
        <div class="qt-pos-row">
          <span>{{ $t('quickTrade.posSize') }}</span>
          <span>{{ currentPosition.size }}</span>
        </div>
        <div class="qt-pos-row">
          <span>{{ $t('quickTrade.entryPrice') }}</span>
          <span>${{ formatPrice(currentPosition.entry_price) }}</span>
        </div>
        <div class="qt-pos-row" v-if="currentPosition.mark_price">
          <span>{{ $t('quickTrade.markPrice') }}</span>
          <span>${{ formatPrice(currentPosition.mark_price) }}</span>
        </div>
        <div class="qt-pos-row" v-if="currentPosition.leverage && currentPosition.leverage > 1">
          <span>{{ $t('quickTrade.leverage') }}</span>
          <span>{{ currentPosition.leverage }}x</span>
        </div>
        <div class="qt-pos-row">
          <span>{{ $t('quickTrade.unrealizedPnl') }}</span>
          <span :class="currentPosition.unrealized_pnl >= 0 ? 'qt-green' : 'qt-red'">
            ${{ formatPrice(currentPosition.unrealized_pnl) }}
          </span>
        </div>
        <a-button
          type="danger"
          size="small"
          block
          ghost
          @click="handleClosePosition"
          :loading="closingPosition"
          style="margin-top: 8px;"
        >
          {{ $t('quickTrade.closePosition') }}
        </a-button>
      </div>
    </div>

    <!-- Recent Trades -->
    <div class="qt-history-section" v-if="recentTrades.length > 0">
      <div class="qt-section-header">
        <a-icon type="history" /> {{ $t('quickTrade.recentTrades') }}
      </div>
      <div class="qt-trade-list">
        <div class="qt-trade-item" v-for="t in recentTrades" :key="t.id">
          <div class="qt-trade-main">
            <a-tag :color="t.side === 'buy' ? '#52c41a' : '#f5222d'" size="small">
              {{ t.side === 'buy' ? 'LONG' : 'SHORT' }}
            </a-tag>
            <span class="qt-trade-symbol">{{ t.symbol }}</span>
            <span class="qt-trade-amount">${{ formatPrice(t.amount) }}</span>
          </div>
          <div class="qt-trade-meta">
            <a-tag :color="t.status === 'filled' ? '#52c41a' : t.status === 'failed' ? '#f5222d' : '#faad14'" size="small">
              {{ t.status }}
            </a-tag>
            <span class="qt-trade-time">{{ formatTime(t.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>

  </a-drawer>
</template>

<script>
import { mapState } from 'vuex'
import { listExchangeCredentials } from '@/api/credentials'
import { placeQuickOrder, getQuickTradeBalance, getQuickTradePosition, getQuickTradeHistory, closeQuickTradePosition } from '@/api/quick-trade'

export default {
  name: 'QuickTradePanel',
  props: {
    visible: { type: Boolean, default: false },
    symbol: { type: String, default: '' },
    presetSide: { type: String, default: '' }, // 'buy' or 'sell' — pre-filled from AI signal
    presetPrice: { type: Number, default: 0 },
    source: { type: String, default: 'manual' }, // ai_radar / ai_analysis / indicator / manual
    marketType: { type: String, default: 'swap' } // swap / spot
  },
  data () {
    return {
      // exchange
      credentials: [],
      selectedCredentialId: undefined,
      credLoading: false,
      balance: { available: 0, total: 0 },
      // order
      side: 'buy',
      orderType: 'market',
      limitPrice: 0,
      amount: 100,
      leverage: 5,
      tpPrice: null,
      slPrice: null,
      // state
      submitting: false,
      closingPosition: false,
      currentPrice: 0,
      currentPosition: null,
      recentTrades: [],
      // constants
      quickAmountPcts: [10, 25, 50, 75, 100],
      leverageMarks: { 1: '1x', 5: '5x', 10: '10x', 25: '25x', 50: '50x', 100: '100x', 125: '125x' },
      // polling
      pollTimer: null
    }
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme
    }),
    isDark () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    priceStep () {
      if (this.currentPrice > 10000) return 1
      if (this.currentPrice > 100) return 0.1
      if (this.currentPrice > 1) return 0.01
      return 0.0001
    },
    pricePrecision () {
      if (this.currentPrice > 10000) return 0
      if (this.currentPrice > 100) return 1
      if (this.currentPrice > 1) return 2
      return 4
    },
    canSubmit () {
      return this.selectedCredentialId && this.symbol && this.amount > 0 && !this.submitting
    },
    priceChangeClass () {
      return ''
    },
    collapseStyle () {
      return { background: 'transparent', borderRadius: '4px', border: 0, overflow: 'hidden' }
    }
  },
  watch: {
    visible (val) {
      if (val) {
        this.init()
      } else {
        this.stopPolling()
      }
    },
    presetSide (val) {
      if (val) this.side = val
    },
    presetPrice (val) {
      if (val > 0) {
        this.currentPrice = val
        this.limitPrice = val
      }
    }
  },
  methods: {
    async init () {
      if (this.presetSide) this.side = this.presetSide
      if (this.presetPrice > 0) {
        this.currentPrice = this.presetPrice
        this.limitPrice = this.presetPrice
      }
      await this.loadCredentials()
      this.loadHistory()
      this.startPolling()
    },
    async loadCredentials () {
      this.credLoading = true
      try {
        const res = await listExchangeCredentials()
        if (res.code === 1 && res.data) {
          const all = res.data.items || res.data || []
          // Quick Trade only supports crypto exchanges — filter out IBKR, MT5, etc.
          const NON_CRYPTO = ['ibkr', 'mt5']
          this.credentials = all.filter(c => {
            const eid = (c.exchange_id || c.name || '').toLowerCase()
            return !NON_CRYPTO.includes(eid)
          })
          // Auto-select first if none selected
          if (!this.selectedCredentialId && this.credentials.length > 0) {
            this.selectedCredentialId = this.credentials[0].id
            this.onCredentialChange(this.selectedCredentialId)
          }
        }
      } catch (e) {
        console.error('loadCredentials error:', e)
      } finally {
        this.credLoading = false
      }
    },
    async onCredentialChange (credId) {
      this.selectedCredentialId = credId
      this.loadBalance()
      this.loadPosition()
    },
    async loadBalance () {
      if (!this.selectedCredentialId) return
      try {
        const res = await getQuickTradeBalance({
          credential_id: this.selectedCredentialId,
          market_type: this.marketType
        })
        if (res.code === 1 && res.data) {
          this.balance = res.data
        }
      } catch (e) {
        console.warn('loadBalance error:', e)
      }
    },
    async loadPosition () {
      if (!this.selectedCredentialId || !this.symbol) return
      try {
        const res = await getQuickTradePosition({
          credential_id: this.selectedCredentialId,
          symbol: this.symbol,
          market_type: this.marketType
        })
        if (res.code === 1 && res.data && res.data.positions && res.data.positions.length > 0) {
          this.currentPosition = res.data.positions[0]
        } else {
          this.currentPosition = null
        }
      } catch (e) {
        console.warn('loadPosition error:', e)
      }
    },
    async loadHistory () {
      try {
        const res = await getQuickTradeHistory({ limit: 5 })
        if (res.code === 1 && res.data) {
          this.recentTrades = res.data.trades || []
        }
      } catch (e) {
        console.warn('loadHistory error:', e)
      }
    },
    setAmountByPercent (pct) {
      if (this.balance.available > 0) {
        this.amount = Math.floor(this.balance.available * pct / 100 * 100) / 100
      }
    },
    async handleSubmit () {
      if (!this.canSubmit) return
      this.submitting = true
      try {
        const payload = {
          credential_id: this.selectedCredentialId,
          symbol: this.symbol,
          side: this.side,
          order_type: this.orderType,
          amount: this.amount,
          price: this.orderType === 'limit' ? this.limitPrice : 0,
          leverage: this.marketType !== 'spot' ? this.leverage : 1,
          market_type: this.marketType,
          tp_price: this.tpPrice || 0,
          sl_price: this.slPrice || 0,
          source: this.source
        }
        const res = await placeQuickOrder(payload)
        if (res.code === 1) {
          this.$message.success(this.$t('quickTrade.orderSuccess'))
          this.$emit('order-success', res.data)
          // Reload all data after successful order
          await this.loadBalance()
          await this.loadPosition() // Reload position to show new position details
          await this.loadHistory()
          // If order was successful and we have a position, show success message with position info
          if (res.data && res.data.exchange_order_id) {
            setTimeout(() => {
              this.loadPosition() // Double-check position after a short delay
            }, 2000)
          }
        } else {
          this.$message.error(res.msg || this.$t('quickTrade.orderFailed'))
        }
      } catch (e) {
        this.$message.error(e.message || this.$t('quickTrade.orderFailed'))
      } finally {
        this.submitting = false
      }
    },
    async handleClosePosition () {
      if (!this.currentPosition || !this.selectedCredentialId) return
      this.closingPosition = true
      try {
        // Use the new close-position API
        const payload = {
          credential_id: this.selectedCredentialId,
          symbol: this.symbol,
          market_type: this.marketType,
          size: 0, // 0 means close full position
          source: 'manual'
        }
        const res = await closeQuickTradePosition(payload)
        if (res.code === 1) {
          this.$message.success(this.$t('quickTrade.positionClosed'))
          this.currentPosition = null
          this.loadBalance()
          this.loadPosition() // Reload position to check if fully closed
          this.loadHistory()
        } else {
          this.$message.error(res.msg || this.$t('quickTrade.orderFailed'))
        }
      } catch (e) {
        this.$message.error(e.message || this.$t('quickTrade.orderFailed'))
      } finally {
        this.closingPosition = false
      }
    },
    startPolling () {
      this.stopPolling()
      this.pollTimer = setInterval(() => {
        if (this.selectedCredentialId) {
          this.loadBalance()
          this.loadPosition()
        }
      }, 10000)
    },
    stopPolling () {
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
    },
    handleClose () {
      this.$emit('close')
      this.$emit('update:visible', false)
    },
    formatPrice (val) {
      const v = parseFloat(val || 0)
      if (Math.abs(v) >= 10000) return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      if (Math.abs(v) >= 100) return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      if (Math.abs(v) >= 1) return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
      return v.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })
    },
    formatTime (ts) {
      if (!ts) return ''
      const d = new Date(ts)
      const pad = n => String(n).padStart(2, '0')
      return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
  },
  beforeDestroy () {
    this.stopPolling()
  }
}
</script>

<style lang="less" scoped>
.quick-trade-drawer {
  /deep/ .ant-drawer-body {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
  }
}

.qt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #f0f0f0;
  .qt-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    .qt-icon {
      font-size: 20px;
      color: #1890ff;
    }
    .qt-header-title {
      font-size: 16px;
      font-weight: 600;
    }
  }
  .qt-close {
    font-size: 16px;
    cursor: pointer;
    color: #999;
    &:hover { color: #333; }
  }
}

.qt-symbol-bar {
  padding: 12px 20px;
  background: linear-gradient(135deg, #f6f8fc 0%, #eef2f8 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  .qt-symbol-info {
    display: flex;
    align-items: center;
    gap: 8px;
    .qt-symbol-name {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
  }
  .qt-current-price {
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }
}

.qt-section {
  padding: 8px 20px;
  .qt-label {
    font-size: 12px;
    color: #999;
    margin-bottom: 4px;
    font-weight: 500;
  }
  .qt-crypto-hint {
    font-size: 10px;
    color: #faad14;
    background: rgba(250, 173, 20, 0.1);
    padding: 1px 6px;
    border-radius: 4px;
    margin-left: 4px;
  }
}

.qt-balance {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 12px;
  .qt-balance-label { color: #999; }
  .qt-balance-value { color: #52c41a; font-weight: 600; }
}

.qt-direction-toggle {
  display: flex;
  gap: 8px;
  .qt-dir-btn {
    flex: 1;
    padding: 10px;
    text-align: center;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    user-select: none;
  }
  .qt-dir-long {
    color: #52c41a;
    background: rgba(82, 196, 26, 0.06);
    border-color: rgba(82, 196, 26, 0.2);
    &.active {
      background: #52c41a;
      color: #fff;
      border-color: #52c41a;
      box-shadow: 0 4px 12px rgba(82, 196, 26, 0.3);
    }
    &:hover:not(.active) {
      border-color: #52c41a;
    }
  }
  .qt-dir-short {
    color: #f5222d;
    background: rgba(245, 34, 45, 0.06);
    border-color: rgba(245, 34, 45, 0.2);
    &.active {
      background: #f5222d;
      color: #fff;
      border-color: #f5222d;
      box-shadow: 0 4px 12px rgba(245, 34, 45, 0.3);
    }
    &:hover:not(.active) {
      border-color: #f5222d;
    }
  }
}

.qt-quick-amounts {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  button { flex: 1; font-size: 12px; }
}

.qt-leverage-row {
  display: flex;
  align-items: center;
}

.qt-tpsl-row {
  display: flex;
  gap: 12px;
  .qt-tpsl-item { flex: 1; }
}

.qt-submit-section {
  padding: 12px 20px;
  .qt-submit-btn {
    height: 48px;
    font-size: 16px;
    font-weight: 700;
    border-radius: 8px;
    letter-spacing: 0.5px;
  }
  .qt-btn-long {
    background: #52c41a !important;
    border-color: #52c41a !important;
    &:hover { background: #73d13d !important; }
    &:active { background: #389e0d !important; }
  }
  .qt-btn-short {
    background: #f5222d !important;
    border-color: #f5222d !important;
    &:hover { background: #ff4d4f !important; }
    &:active { background: #cf1322 !important; }
  }
}

.qt-position-section,
.qt-history-section {
  padding: 8px 20px 12px;
  .qt-section-header {
    font-size: 13px;
    font-weight: 600;
    color: #666;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.qt-position-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 10px 12px;
  border-left: 3px solid #d9d9d9;
  &.long { border-left-color: #52c41a; }
  &.short { border-left-color: #f5222d; }
  .qt-pos-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    padding: 2px 0;
    span:first-child { color: #999; }
  }
}

.qt-green { color: #52c41a !important; }
.qt-red   { color: #f5222d !important; }

.qt-trade-list {
  .qt-trade-item {
    padding: 6px 0;
    border-bottom: 1px solid #f5f5f5;
    &:last-child { border-bottom: none; }
    .qt-trade-main {
      display: flex;
      align-items: center;
      gap: 6px;
      .qt-trade-symbol { font-weight: 600; font-size: 13px; }
      .qt-trade-amount { margin-left: auto; font-size: 13px; }
    }
    .qt-trade-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 2px;
      .qt-trade-time { font-size: 11px; color: #bbb; }
    }
  }
}

/* ======== Dark Theme ======== */
.theme-dark {
  .qt-header {
    border-bottom-color: #303030;
    .qt-header-title { color: #e0e0e0; }
    .qt-close { color: #666; &:hover { color: #bbb; } }
  }
  .qt-symbol-bar {
    background: linear-gradient(135deg, #1a1f2e 0%, #141824 100%);
    .qt-symbol-name { color: #e0e0e0; }
    .qt-current-price { color: #e0e0e0; }
  }
  .qt-section {
    .qt-label { color: #777; }
  }
  .qt-position-card {
    background: #1a1f2e;
    .qt-pos-row span:first-child { color: #777; }
    .qt-pos-row span:last-child { color: #ccc; }
  }
  .qt-trade-item {
    border-bottom-color: #2a2a2a !important;
    .qt-trade-symbol { color: #e0e0e0; }
    .qt-trade-amount { color: #ccc; }
  }
  /deep/ .ant-collapse {
    background: transparent !important;
    color: #ccc;
    .ant-collapse-header { color: #ccc !important; }
    .ant-collapse-content { background: transparent; color: #ccc; }
  }
  /deep/ .ant-drawer-content {
    background: #141414;
  }
  /deep/ .ant-select-selection,
  /deep/ .ant-input-number {
    background: #1a1f2e;
    border-color: #303030;
    color: #e0e0e0;
  }
  /deep/ .ant-radio-group .ant-radio-button-wrapper {
    background: #1a1f2e;
    border-color: #303030;
    color: #ccc;
    &.ant-radio-button-wrapper-checked {
      background: #1890ff;
      border-color: #1890ff;
      color: #fff;
    }
  }
  /deep/ .ant-slider-rail { background: #303030; }
  /deep/ .ant-slider-track { background: #1890ff; }
}
</style>

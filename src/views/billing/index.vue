<template>
  <div class="billing-page" :class="{ 'theme-dark': isDarkTheme }">
    <div class="page-header">
      <h2 class="page-title">
        <a-icon type="wallet" />
        <span>{{ $t('billing.title') }}</span>
      </h2>
      <p class="page-desc">{{ $t('billing.desc') }}</p>
    </div>

    <a-card :bordered="false" class="snapshot-card">
      <div class="snapshot-row">
        <div class="snap-item">
          <div class="snap-label">{{ $t('billing.snapshot.credits') }}</div>
          <div class="snap-value">{{ formatCredits(billing.credits) }}</div>
        </div>
        <div class="snap-item">
          <div class="snap-label">{{ $t('billing.snapshot.vip') }}</div>
          <div class="snap-value">
            <a-tag v-if="billing.is_vip" color="gold">
              <a-icon type="crown" /> VIP
            </a-tag>
            <a-tag v-else>{{ $t('billing.snapshot.notVip') }}</a-tag>
            <span v-if="billing.vip_expires_at" class="vip-exp">
              {{ $t('billing.snapshot.expires') }}: {{ formatDate(billing.vip_expires_at) }}
            </span>
          </div>
        </div>
      </div>
      <a-alert
        style="margin-top: 12px;"
        type="info"
        show-icon
        :message="$t('billing.vipRule.title')"
        :description="$t('billing.vipRule.desc')"
      />
    </a-card>

    <a-row :gutter="16" style="margin-top: 16px;">
      <a-col :xs="24" :md="8">
        <a-card :bordered="false" class="plan-card">
          <div class="plan-title">{{ $t('billing.plan.monthly') }}</div>
          <div class="plan-price">
            ${{ plans.monthly.price_usd }}
            <span class="plan-unit">/ {{ $t('billing.perMonth') }}</span>
          </div>
          <div class="plan-benefit">
            +{{ plans.monthly.credits_once }} {{ $t('billing.credits') }}
          </div>
          <a-button type="primary" block :loading="purchasing === 'monthly'" @click="buy('monthly')">
            {{ $t('billing.buyNow') }}
          </a-button>
        </a-card>
      </a-col>

      <a-col :xs="24" :md="8">
        <a-card :bordered="false" class="plan-card highlight">
          <div class="plan-title">{{ $t('billing.plan.yearly') }}</div>
          <div class="plan-price">
            ${{ plans.yearly.price_usd }}
            <span class="plan-unit">/ {{ $t('billing.perYear') }}</span>
          </div>
          <div class="plan-benefit">
            +{{ plans.yearly.credits_once }} {{ $t('billing.credits') }}
          </div>
          <a-button type="primary" block :loading="purchasing === 'yearly'" @click="buy('yearly')">
            {{ $t('billing.buyNow') }}
          </a-button>
        </a-card>
      </a-col>

      <a-col :xs="24" :md="8">
        <a-card :bordered="false" class="plan-card">
          <div class="plan-title">{{ $t('billing.plan.lifetime') }}</div>
          <div class="plan-price">
            ${{ plans.lifetime.price_usd }}
            <span class="plan-unit">{{ $t('billing.once') }}</span>
          </div>
          <div class="plan-benefit">
            {{ $t('billing.lifetimeMonthly') }} +{{ plans.lifetime.credits_monthly }} {{ $t('billing.credits') }}
          </div>
          <a-button type="primary" block :loading="purchasing === 'lifetime'" @click="buy('lifetime')">
            {{ $t('billing.buyNow') }}
          </a-button>
        </a-card>
      </a-col>
    </a-row>

    <!-- USDT Pay Modal -->
    <a-modal
      v-model="usdtModalVisible"
      :title="null"
      :footer="null"
      :maskClosable="false"
      :closable="false"
      wrapClassName="usdt-pay-modal-wrap"
      width="600px"
      @cancel="closeUsdtModal"
    >
      <div v-if="usdtOrder" class="usdt-checkout">
        <!-- Custom Header -->
        <div class="checkout-header">
          <div class="header-left">
            <div class="usdt-logo">
              <svg viewBox="0 0 32 32" width="28" height="28"><circle cx="16" cy="16" r="16" fill="#26A17B"/><path d="M17.9 17.9v-.003c-.1.008-.6.04-1.8.04-1 0-1.5-.028-1.7-.04v.004c-3.4-.15-5.9-.74-5.9-1.44 0-.7 2.5-1.29 5.9-1.44v2.3c.2.013.7.05 1.7.05 1.2 0 1.6-.04 1.8-.05v-2.3c3.4.15 5.9.74 5.9 1.44 0 .7-2.5 1.29-5.9 1.44zm0-3.12V12.7h5v-2.4H9.2v2.4h5v2.08c-3.8.18-6.7.93-6.7 1.83s2.9 1.65 6.7 1.83v6.56h3.6v-6.56c3.8-.18 6.7-.93 6.7-1.83s-2.8-1.65-6.6-1.83z" fill="#fff"/></svg>
            </div>
            <div class="header-text">
              <div class="header-title">{{ $t('billing.usdt.title') }}</div>
              <div class="header-desc">{{ $t('billing.usdt.hintDesc') }}</div>
            </div>
          </div>
          <a-button type="link" class="close-btn" @click="closeUsdtModal">
            <a-icon type="close" />
          </a-button>
        </div>

        <!-- Status Steps -->
        <div class="checkout-steps">
          <div
            v-for="(step, idx) in stepItems"
            :key="idx"
            class="step-item"
            :class="{ active: idx <= usdtStepCurrent, current: idx === usdtStepCurrent }"
          >
            <div class="step-dot">
              <span class="dot-inner" />
              <span v-if="idx === usdtStepCurrent && usdtOrder.status === 'pending'" class="dot-pulse" />
            </div>
            <span class="step-label">{{ step }}</span>
            <div v-if="idx < stepItems.length - 1" class="step-line" :class="{ filled: idx < usdtStepCurrent }" />
          </div>
        </div>

        <!-- Main Content -->
        <div class="checkout-body">
          <!-- QR Section -->
          <div class="qr-section">
            <div class="qr-frame" :class="{ 'qr-confirmed': usdtOrder.status === 'confirmed' }">
              <img :src="usdtQrUrl" alt="USDT QR" />
            </div>
            <div class="qr-amount">
              <span class="amt-number">{{ usdtOrder.amount_usdt }}</span>
              <span class="amt-currency">USDT</span>
            </div>
            <div class="qr-chain">
              <a-tag color="green">{{ usdtOrder.chain }}</a-tag>
            </div>
          </div>

          <!-- Info Section -->
          <div class="info-section">
            <!-- Address -->
            <div class="info-block">
              <div class="info-label">
                <a-icon type="environment" />
                <span>{{ $t('billing.usdt.address') }}</span>
              </div>
              <div class="addr-box">
                <code class="addr-text">{{ usdtOrder.address }}</code>
                <a-tooltip :title="$t('billing.usdt.copyAddress')">
                  <a-button size="small" class="copy-btn" @click="copyText(usdtOrder.address)">
                    <a-icon type="copy" />
                  </a-button>
                </a-tooltip>
              </div>
            </div>

            <!-- Amount -->
            <div class="info-block">
              <div class="info-label">
                <a-icon type="dollar" />
                <span>{{ $t('billing.usdt.amount') }}</span>
              </div>
              <div class="amt-box">
                <code class="amt-text">{{ usdtOrder.amount_usdt }} USDT</code>
                <a-tooltip :title="$t('billing.usdt.copyAmount')">
                  <a-button size="small" class="copy-btn" @click="copyText(usdtOrder.amount_usdt)">
                    <a-icon type="copy" />
                  </a-button>
                </a-tooltip>
              </div>
            </div>

            <!-- Warning -->
            <div class="warn-strip">
              <a-icon type="exclamation-circle" />
              <span>{{ $t('billing.usdt.hintTitle') }}</span>
            </div>

            <!-- Expiry & Status -->
            <div class="meta-row">
              <div class="meta-status">
                <a-tag :color="statusColor">{{ statusText }}</a-tag>
              </div>
              <div v-if="usdtOrder.expires_at" class="meta-expire">
                <a-icon type="clock-circle" />
                <span>{{ formatDateTime(usdtOrder.expires_at) }}</span>
              </div>
            </div>

            <!-- Expired: contact support -->
            <div v-if="usdtOrder.status === 'expired'" class="expired-hint">
              <a-alert
                type="warning"
                :message="$t('billing.usdt.expiredHint')"
                show-icon
                banner
              />
            </div>

            <!-- Confirmed: success banner -->
            <div v-if="usdtOrder.status === 'confirmed'" class="confirmed-hint">
              <a-alert
                type="success"
                :message="$t('billing.usdt.confirmedHint')"
                show-icon
                banner
              />
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="checkout-footer">
          <a-button v-if="usdtOrder.status !== 'confirmed'" size="small" :loading="usdtRefreshing" @click="refreshUsdtOrder">
            <a-icon type="reload" />
            {{ $t('billing.usdt.refresh') }}
          </a-button>
          <a-button v-if="usdtOrder.status === 'confirmed'" type="primary" @click="closeUsdtModal">
            <a-icon type="check-circle" />
            {{ $t('common.done') || 'Done' }}
          </a-button>
          <a-button v-else @click="closeUsdtModal">{{ $t('common.close') || 'Close' }}</a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { getMembershipPlans, createUsdtOrder, getUsdtOrder } from '@/api/billing'

export default {
  name: 'BillingPage',
  computed: {
    ...mapState({
      navTheme: state => state.app.theme
    }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    usdtQrUrl () {
      const text = this.getUsdtQrText()
      if (!text) return ''
      // External QR generator (MVP). Replace with local generator later if needed.
      return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(text)}`
    },
    statusText () {
      const s = (this.usdtOrder && this.usdtOrder.status) ? String(this.usdtOrder.status) : ''
      const map = {
        pending: this.$t('billing.usdt.status.pending'),
        paid: this.$t('billing.usdt.status.paid'),
        confirmed: this.$t('billing.usdt.status.confirmed'),
        expired: this.$t('billing.usdt.status.expired'),
        cancelled: this.$t('billing.usdt.status.cancelled'),
        failed: this.$t('billing.usdt.status.failed')
      }
      return map[s] || s || '--'
    },
    statusColor () {
      const s = (this.usdtOrder && this.usdtOrder.status) ? String(this.usdtOrder.status) : ''
      if (s === 'confirmed') return 'green'
      if (s === 'paid') return 'blue'
      if (s === 'expired' || s === 'failed' || s === 'cancelled') return 'red'
      return 'orange'
    },
    usdtStepCurrent () {
      const s = (this.usdtOrder && this.usdtOrder.status) ? String(this.usdtOrder.status) : ''
      if (s === 'confirmed') return 2
      if (s === 'paid') return 1
      return 0
    },
    stepItems () {
      return [
        this.$t('billing.usdt.status.pending'),
        this.$t('billing.usdt.status.paid'),
        this.$t('billing.usdt.status.confirmed')
      ]
    }
  },
  data () {
    return {
      loading: false,
      purchasing: '',
      usdtModalVisible: false,
      usdtOrder: null,
      usdtPollingTimer: null,
      usdtRefreshing: false,
      billing: {
        credits: 0,
        is_vip: false,
        vip_expires_at: null
      },
      plans: {
        monthly: { price_usd: 19.9, credits_once: 500 },
        yearly: { price_usd: 199, credits_once: 8000 },
        lifetime: { price_usd: 499, credits_monthly: 800 }
      }
    }
  },
  created () {
    this.load()
  },
  beforeDestroy () {
    this.stopUsdtPolling()
  },
  methods: {
    async load () {
      this.loading = true
      try {
        const res = await getMembershipPlans()
        if (res && res.code === 1 && res.data) {
          this.plans = res.data.plans || this.plans
          this.billing = res.data.billing || this.billing
        } else {
          this.$message.error(res?.msg || 'Load failed')
        }
      } catch (e) {
        this.$message.error(e?.response?.data?.msg || 'Load failed')
      } finally {
        this.loading = false
      }
    },
    formatCredits (v) {
      if (!v && v !== 0) return '0'
      return Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    },
    formatDate (dateStr) {
      if (!dateStr) return ''
      return new Date(dateStr).toLocaleDateString()
    },
    async buy (plan) {
      this.purchasing = plan
      try {
        // Prefer USDT scan-to-pay flow (方案B)
        const res = await createUsdtOrder(plan)
        if (res && res.code === 1 && res.data) {
          this.usdtOrder = res.data
          this.usdtModalVisible = true
          this.startUsdtPolling()
        } else {
          this.$message.error(res?.msg || this.$t('billing.purchaseFailed'))
        }
      } catch (e) {
        this.$message.error(e?.response?.data?.msg || this.$t('billing.purchaseFailed'))
      } finally {
        this.purchasing = ''
      }
    },

    getUsdtQrText () {
      // Keep it simple: QR encodes address only to avoid wallet URI incompatibilities.
      if (!this.usdtOrder) return ''
      return this.usdtOrder.address || ''
    },

    copyText (txt) {
      try {
        const t = String(txt || '')
        if (!t) return
        this.$copyText(t)
        this.$message.success(this.$t('common.copySuccess') || 'Copied')
      } catch (e) {
        this.$message.error(this.$t('common.copyFailed') || 'Copy failed')
      }
    },

    formatDateTime (dateStr) {
      if (!dateStr) return ''
      return new Date(dateStr).toLocaleString()
    },

    async refreshUsdtOrder () {
      if (!this.usdtOrder || !this.usdtOrder.order_id) return
      this.usdtRefreshing = true
      try {
        const res = await getUsdtOrder(this.usdtOrder.order_id, true)
        if (res && res.code === 1 && res.data) {
          this.usdtOrder = res.data
          const status = this.usdtOrder.status
          if (status === 'confirmed') {
            this.$message.success(this.$t('billing.usdt.paidSuccess'))
            this.stopUsdtPolling()
            await this.load()
          } else if (status === 'expired' || status === 'failed' || status === 'cancelled') {
            // Terminal state — stop polling
            this.stopUsdtPolling()
          }
        }
      } catch (e) {
        // Ignore polling errors
      } finally {
        this.usdtRefreshing = false
      }
    },

    startUsdtPolling () {
      this.stopUsdtPolling()
      this.usdtPollingTimer = setInterval(() => {
        this.refreshUsdtOrder()
      }, 5000)
    },

    stopUsdtPolling () {
      if (this.usdtPollingTimer) {
        clearInterval(this.usdtPollingTimer)
        this.usdtPollingTimer = null
      }
    },

    closeUsdtModal () {
      this.usdtModalVisible = false
      this.stopUsdtPolling()
    }
  }
}
</script>

<style lang="less" scoped>
/* ===== Page Styles ===== */
.billing-page {
  padding: 18px;

  .page-header {
    margin-bottom: 14px;
    .page-title {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
      color: rgba(0, 0, 0, 0.85);
    }
    .page-desc {
      margin: 6px 0 0;
      color: rgba(0, 0, 0, 0.45);
    }
  }

  .snapshot-card {
    .snapshot-row {
      display: flex;
      gap: 18px;
      flex-wrap: wrap;
    }
    .snap-item {
      min-width: 220px;
      .snap-label { color: rgba(0, 0, 0, 0.45); font-size: 12px; }
      .snap-value { font-size: 18px; font-weight: 700; margin-top: 2px; }
      .vip-exp { margin-left: 8px; color: rgba(0, 0, 0, 0.55); font-size: 12px; }
    }
  }

  .plan-card {
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    margin-top: 12px;
    &.highlight { border: 1px solid rgba(24, 144, 255, 0.35); }
    .plan-title {
      font-weight: 700;
      font-size: 16px;
      color: rgba(0, 0, 0, 0.85);
    }
    .plan-price {
      margin-top: 10px;
      font-size: 28px;
      font-weight: 800;
      color: rgba(0, 0, 0, 0.85);
      .plan-unit {
        font-size: 12px;
        font-weight: 500;
        color: rgba(0, 0, 0, 0.45);
        margin-left: 6px;
      }
    }
    .plan-benefit {
      margin: 10px 0 16px;
      color: rgba(0, 0, 0, 0.65);
      font-weight: 600;
    }
  }

  &.theme-dark {
    .page-header {
      .page-title { color: rgba(255, 255, 255, 0.9); }
      .page-desc { color: rgba(255, 255, 255, 0.55); }
    }
    .snapshot-card {
      background: #161b22;
      .snap-item {
        .snap-label { color: rgba(255, 255, 255, 0.55); }
        .snap-value { color: rgba(255, 255, 255, 0.9); }
        .vip-exp { color: rgba(255, 255, 255, 0.6); }
      }
    }
    .plan-card {
      background: #161b22;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      .plan-title { color: rgba(255, 255, 255, 0.9); }
      .plan-price {
        color: rgba(255, 255, 255, 0.9);
        .plan-unit { color: rgba(255, 255, 255, 0.55); }
      }
      .plan-benefit { color: rgba(255, 255, 255, 0.7); }
    }
  }
}

/* ===== USDT Checkout Modal (unscoped for modal portal) ===== */
</style>

<style lang="less">
/* ===== Modal Wrapper ===== */
.usdt-pay-modal-wrap {
  .ant-modal-header { display: none; }
  .ant-modal-body { padding: 0 !important; }
  .ant-modal-content { border-radius: 16px; overflow: hidden; }
}

/* ===== Checkout UI ===== */
.usdt-checkout {
  /* -- Header -- */
  .checkout-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: linear-gradient(135deg, #26A17B 0%, #1b8a6b 100%);
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      .usdt-logo {
        width: 40px; height: 40px; border-radius: 50%;
        background: rgba(255,255,255,0.18);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .header-text {
        .header-title { font-size: 16px; font-weight: 800; color: #fff; }
        .header-desc { font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 2px; line-height: 1.4; }
      }
    }
    .close-btn {
      color: rgba(255,255,255,0.8) !important;
      font-size: 18px;
      &:hover { color: #fff !important; }
    }
  }

  /* -- Steps -- */
  .checkout-steps {
    display: flex;
    align-items: center;
    padding: 16px 24px 12px;
    .step-item {
      display: flex;
      align-items: center;
      gap: 6px;
      .step-dot {
        position: relative;
        width: 18px; height: 18px;
        display: flex; align-items: center; justify-content: center;
        .dot-inner {
          width: 10px; height: 10px; border-radius: 50%;
          background: #d9d9d9;
          transition: all 0.3s;
        }
        .dot-pulse {
          position: absolute;
          width: 18px; height: 18px; border-radius: 50%;
          background: rgba(38, 161, 123, 0.35);
          animation: pulse-ring 1.5s ease-out infinite;
        }
      }
      .step-label {
        font-size: 12px;
        color: rgba(0,0,0,0.35);
        font-weight: 500;
        white-space: nowrap;
        transition: all 0.3s;
      }
      .step-line {
        flex: 1;
        height: 2px;
        min-width: 30px;
        background: #e8e8e8;
        margin: 0 6px;
        border-radius: 1px;
        transition: all 0.3s;
        &.filled { background: #26A17B; }
      }
      &.active {
        .dot-inner { background: #26A17B; }
        .step-label { color: rgba(0,0,0,0.85); font-weight: 700; }
      }
      &.current {
        .dot-inner { background: #26A17B; box-shadow: 0 0 0 3px rgba(38, 161, 123, 0.2); }
      }
    }
  }

  @keyframes pulse-ring {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(1.8); opacity: 0; }
  }

  /* -- Body -- */
  .checkout-body {
    display: flex;
    gap: 20px;
    padding: 4px 24px 16px;

    .qr-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;

      .qr-frame {
        width: 180px; height: 180px;
        padding: 8px;
        border-radius: 14px;
        background: #fff;
        border: 2px solid #e8e8e8;
        display: flex; align-items: center; justify-content: center;
        position: relative;
        transition: border-color 0.4s;
        box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        img { width: 100%; height: 100%; border-radius: 8px; }
        &.qr-confirmed {
          border-color: #26A17B;
          &::after {
            content: '\2713';
            position: absolute;
            top: -10px; right: -10px;
            width: 28px; height: 28px;
            background: #26A17B;
            color: #fff;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 16px; font-weight: 700;
            box-shadow: 0 2px 8px rgba(38,161,123,0.4);
          }
        }
      }

      .qr-amount {
        margin-top: 12px;
        display: flex;
        align-items: baseline;
        gap: 4px;
        .amt-number {
          font-size: 22px;
          font-weight: 900;
          color: rgba(0,0,0,0.88);
          letter-spacing: -0.5px;
        }
        .amt-currency {
          font-size: 12px;
          font-weight: 700;
          color: rgba(0,0,0,0.45);
        }
      }

      .qr-chain {
        margin-top: 4px;
      }
    }

    .info-section {
      flex: 1;
      min-width: 0;

      .info-block {
        margin-bottom: 14px;
        .info-label {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; color: rgba(0,0,0,0.45); font-weight: 600;
          margin-bottom: 6px;
        }
      }

      .addr-box, .amt-box {
        display: flex;
        align-items: center;
        gap: 6px;
        background: #f6f8fa;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        padding: 8px 10px;

        code {
          flex: 1;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
          font-size: 12px;
          color: rgba(0,0,0,0.78);
          word-break: break-all;
          line-height: 1.5;
          background: none;
          border: none;
          padding: 0;
        }

        .copy-btn {
          flex-shrink: 0;
          border: none;
          background: rgba(0,0,0,0.04);
          color: rgba(0,0,0,0.55);
          border-radius: 6px;
          &:hover {
            background: rgba(24, 144, 255, 0.08);
            color: #1890ff;
          }
        }
      }

      .warn-strip {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 8px;
        background: rgba(250, 173, 20, 0.08);
        border: 1px solid rgba(250, 173, 20, 0.2);
        font-size: 12px;
        font-weight: 600;
        color: #d48806;
        margin-bottom: 14px;
      }

      .meta-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        .meta-expire {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: rgba(0,0,0,0.45);
        }
      }

      .expired-hint, .confirmed-hint {
        margin-top: 12px;
      }
    }
  }

  /* -- Footer -- */
  .checkout-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 24px 16px;
    border-top: 1px solid rgba(0,0,0,0.06);
  }
}

/* ===== Mobile ===== */
@media (max-width: 560px) {
  .usdt-checkout .checkout-body {
    flex-direction: column;
    align-items: center;
    .info-section { width: 100%; }
  }
}

/* ===== Dark Theme (applied via parent .theme-dark) ===== */
.theme-dark .usdt-checkout,
body.realdark .usdt-checkout {
  .checkout-header {
    background: linear-gradient(135deg, #1a7a5a 0%, #145c45 100%);
  }
  .checkout-steps {
    .step-item {
      .step-label { color: rgba(255,255,255,0.35); }
      .step-line { background: rgba(255,255,255,0.12); &.filled { background: #26A17B; } }
      &.active .step-label { color: rgba(255,255,255,0.9); }
      .dot-inner { background: rgba(255,255,255,0.2); }
      &.active .dot-inner { background: #26A17B; }
    }
  }
  .checkout-body {
    .qr-section {
      .qr-frame { background: #1a1f28; border-color: rgba(255,255,255,0.1); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
      .qr-amount .amt-number { color: rgba(255,255,255,0.9); }
      .qr-amount .amt-currency { color: rgba(255,255,255,0.5); }
    }
    .info-section {
      .info-block .info-label { color: rgba(255,255,255,0.5); }
      .addr-box, .amt-box {
        background: rgba(255,255,255,0.06);
        border-color: rgba(255,255,255,0.1);
        code { color: rgba(255,255,255,0.8); }
        .copy-btn {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.6);
          &:hover { background: rgba(24, 144, 255, 0.15); color: #40a9ff; }
        }
      }
      .warn-strip {
        background: rgba(250, 173, 20, 0.1);
        border-color: rgba(250, 173, 20, 0.2);
        color: #faad14;
      }
      .meta-row .meta-expire { color: rgba(255,255,255,0.45); }
    }
  }
  .checkout-footer { border-top-color: rgba(255,255,255,0.08); }
}
</style>

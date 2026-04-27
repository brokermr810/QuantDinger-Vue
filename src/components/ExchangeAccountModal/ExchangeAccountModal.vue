<template>
  <a-modal
    :title="$t('profile.exchange.addTitle')"
    :visible="visible"
    :wrap-class-name="modalWrapClass"
    :get-container="exchangeModalGetContainer"
    :confirmLoading="savingExchange"
    :ok-button-props="{ disabled: saveDesktopBlocked }"
    @ok="handleSaveExchange"
    @cancel="handleCancel"
    :okText="$t('common.save')"
    :cancelText="$t('common.cancel')"
    :maskClosable="false"
    width="520px"
  >
    <a-alert
      v-if="!desktopPolicyLoading && !desktopBrokersAllowed"
      type="error"
      show-icon
      style="margin-bottom: 16px"
      :message="$t('profile.exchange.desktopBrokersDisabledTitle')"
      :description="desktopBrokersDisabledMessage || $t('profile.exchange.desktopBrokersDisabledFallback')"
    />
    <a-form :form="exchangeForm" layout="vertical" class="exchange-account-form">
      <a-form-item :label="$t('profile.exchange.selectExchange')">
        <a-select
          v-decorator="['exchange_id', { rules: [{ required: true, message: $t('profile.exchange.selectExchange') }] }]"
          :placeholder="$t('profile.exchange.selectExchange')"
          :dropdown-class-name="exchangeSelectDropdownClass"
          :get-popup-container="getExchangeSelectPopupContainer"
          @change="handleExchangeTypeChange"
        >
          <a-select-opt-group :label="$t('profile.exchange.typeCrypto')">
            <a-select-option v-for="ex in cryptoExchangeList" :key="ex.id" :value="ex.id">
              {{ ex.name }}
            </a-select-option>
          </a-select-opt-group>
          <a-select-opt-group :label="$t('profile.exchange.typeIBKR')">
            <a-select-option value="ibkr" :disabled="desktopBrokersBlockDesktop">
              Interactive Brokers (IBKR)
              <span v-if="desktopBrokersBlockDesktop" class="exchange-option-cloud-hint">
                ({{ $t('profile.exchange.desktopBrokersOptionSuffix') }})
              </span>
            </a-select-option>
          </a-select-opt-group>
          <a-select-opt-group :label="$t('profile.exchange.typeMT5')">
            <a-select-option value="mt5" :disabled="desktopBrokersBlockDesktop">
              MetaTrader 5
              <span v-if="desktopBrokersBlockDesktop" class="exchange-option-cloud-hint">
                ({{ $t('profile.exchange.desktopBrokersOptionSuffix') }})
              </span>
            </a-select-option>
          </a-select-opt-group>
        </a-select>
      </a-form-item>

      <a-form-item :label="$t('profile.exchange.accountName')">
        <a-input
          v-decorator="['name']"
          :placeholder="$t('profile.exchange.accountNamePlaceholder')"
        />
      </a-form-item>

      <a-form-item v-if="addExchangeType === 'crypto'" :label="$t('profile.exchange.whitelistIpLabel')">
        <div class="egress-ip-block">
          <a-spin v-if="egressIpLoading" size="small" />
          <template v-else>
            <div class="egress-ip-line">
              <span class="egress-ip-kind">{{ $t('profile.exchange.whitelistIpv4') }}</span>
              <code class="egress-ip-value">{{ egressServerIpv4 || '—' }}</code>
              <a-button type="link" size="small" class="egress-ip-action" @click="copyEgressIp('v4')" :disabled="!egressServerIpv4">
                {{ $t('profile.exchange.whitelistIpCopy') }}
              </a-button>
            </div>
            <div class="egress-ip-line">
              <span class="egress-ip-kind">{{ $t('profile.exchange.whitelistIpv6') }}</span>
              <code class="egress-ip-value">{{ egressServerIpv6 || '—' }}</code>
              <a-button type="link" size="small" class="egress-ip-action" @click="copyEgressIp('v6')" :disabled="!egressServerIpv6">
                {{ $t('profile.exchange.whitelistIpCopy') }}
              </a-button>
            </div>
            <div class="egress-ip-row egress-ip-refresh-row">
              <a-button type="link" size="small" class="egress-ip-action" @click="fetchEgressIp">
                {{ $t('profile.exchange.whitelistIpRefresh') }}
              </a-button>
            </div>
          </template>
        </div>
        <div class="field-hint egress-ip-hint">{{ $t('profile.exchange.whitelistIpHint') }}</div>
      </a-form-item>

      <template v-if="addExchangeType === 'crypto'">
        <div v-if="selectedExchangeApiDocUrl" class="exchange-api-doc-callout">
          <div class="exchange-api-doc-callout__content">
            <div class="exchange-api-doc-callout__icon">
              <a-icon type="link" />
            </div>
            <div class="exchange-api-doc-callout__text">
              <div class="exchange-api-doc-callout__title">
                {{ selectedCryptoExchangeName }} {{ $t('profile.exchange.apiDocTitleSuffix') }}
              </div>
              <div class="exchange-api-doc-callout__hint">
                {{ $t('profile.exchange.apiDocHint') }}
              </div>
            </div>
          </div>
          <a-button type="link" size="small" class="exchange-api-doc-callout__action" @click="openSelectedExchangeApiDoc">
            {{ $t('profile.exchange.apiDocAction') }}
            <a-icon type="arrow-right" />
          </a-button>
        </div>
        <a-form-item :label="$t('profile.exchange.apiKey')">
          <a-input-password
            v-decorator="['api_key', { rules: [{ required: true, message: 'API Key is required' }] }]"
            placeholder="API Key"
            autocomplete="new-password"
          />
        </a-form-item>
        <a-form-item :label="$t('profile.exchange.secretKey')">
          <a-input-password
            v-decorator="['secret_key', { rules: [{ required: true, message: 'Secret Key is required' }] }]"
            placeholder="Secret Key"
            autocomplete="new-password"
          />
        </a-form-item>
        <a-form-item v-if="addExchangeNeedsPassphrase" :label="$t('profile.exchange.passphrase')">
          <a-input-password
            v-decorator="['passphrase']"
            placeholder="Passphrase"
            autocomplete="new-password"
          />
        </a-form-item>
        <a-form-item v-if="addExchangeShowDemo">
          <a-checkbox v-decorator="['enable_demo_trading', { valuePropName: 'checked', initialValue: false }]" class="exchange-demo-checkbox">
            <span class="exchange-demo-checkbox-label">{{ $t('profile.exchange.demoTrading') }}</span>
          </a-checkbox>
          <div class="field-hint exchange-demo-hint">{{ $t('profile.exchange.demoTradingHint') }}</div>
        </a-form-item>
      </template>

      <template v-if="addExchangeType === 'ibkr'">
        <a-alert
          type="warning"
          showIcon
          style="margin-bottom: 16px"
          :message="$t('profile.exchange.localDeploymentRequired')"
          :description="$t('profile.exchange.localDeploymentHint')"
        />
        <a-form-item :label="$t('profile.exchange.ibkrHost')">
          <a-input v-decorator="['ibkr_host', { initialValue: '127.0.0.1' }]" placeholder="127.0.0.1" />
        </a-form-item>
        <a-form-item :label="$t('profile.exchange.ibkrPort')">
          <a-input-number
            v-decorator="['ibkr_port', { initialValue: 7497 }]"
            :min="1"
            :max="65535"
            style="width: 100%"
          />
          <div class="field-hint">
            <a-icon type="info-circle" />
            <span>{{ $t('profile.exchange.ibkrPortHint') }}</span>
          </div>
        </a-form-item>
        <a-form-item :label="$t('profile.exchange.ibkrClientId')">
          <a-input-number v-decorator="['ibkr_client_id', { initialValue: 1 }]" :min="1" :max="999" style="width: 100%" />
        </a-form-item>
        <a-form-item :label="$t('profile.exchange.ibkrAccount')">
          <a-input v-decorator="['ibkr_account']" placeholder="DU123456" />
        </a-form-item>
      </template>

      <template v-if="addExchangeType === 'mt5'">
        <a-alert
          type="warning"
          showIcon
          style="margin-bottom: 16px"
          :message="$t('profile.exchange.localDeploymentRequired')"
          :description="$t('profile.exchange.localDeploymentHint')"
        />
        <a-form-item :label="$t('profile.exchange.mt5Server')">
          <a-input v-decorator="['mt5_server', { rules: [{ required: true, message: 'Server is required' }] }]" placeholder="MetaQuotes-Demo" />
        </a-form-item>
        <a-form-item :label="$t('profile.exchange.mt5Login')">
          <a-input-number
            v-decorator="['mt5_login', { rules: [{ required: true, message: 'Login is required' }] }]"
            :min="1"
            style="width: 100%"
            placeholder="12345678"
          />
        </a-form-item>
        <a-form-item :label="$t('profile.exchange.mt5Password')">
          <a-input-password
            v-decorator="['mt5_password', { rules: [{ required: true, message: 'Password is required' }] }]"
            placeholder="Password"
            autocomplete="new-password"
          />
        </a-form-item>
        <a-form-item :label="$t('profile.exchange.mt5TerminalPath')">
          <a-input v-decorator="['mt5_terminal_path']" placeholder="C:\Program Files\MetaTrader 5\terminal64.exe" />
          <div class="field-hint">
            <a-icon type="info-circle" />
            <span>{{ $t('profile.exchange.mt5TerminalPathHint') }}</span>
          </div>
        </a-form-item>
      </template>

      <a-form-item v-if="addExchangeType">
        <a-button
          block
          :loading="testingExchange"
          :disabled="testingDesktopBlocked"
          @click="handleTestExchangeConnection"
        >
          <a-icon type="api" />
          {{ $t('profile.exchange.testConnection') }}
        </a-button>
        <div v-if="exchangeTestResult" class="test-result-msg" :class="exchangeTestResult.success ? 'success' : 'error'">
          <a-icon :type="exchangeTestResult.success ? 'check-circle' : 'close-circle'" />
          {{ exchangeTestResult.message }}
        </div>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script>
import { mapState } from 'vuex'
import { createExchangeCredential, getCredentialsEgressIp, getDesktopBrokersPolicy } from '@/api/credentials'
import { testExchangeConnection } from '@/api/strategy'

export default {
  name: 'ExchangeAccountModal',
  props: {
    visible: { type: Boolean, default: false },
    /** 返回挂载节点；用于浏览器全屏时与图表同层（如指标 IDE 闪电交易） */
    overlayMount: { type: Function, default: null }
  },
  data () {
    return {
      savingExchange: false,
      testingExchange: false,
      exchangeTestResult: null,
      addExchangeType: '',
      selectedExchangeId: '',
      egressServerIpv4: '',
      egressServerIpv6: '',
      egressIpLoading: false,
      desktopBrokersAllowed: true,
      desktopPolicyLoading: false,
      desktopBrokersDisabledMessage: '',
      cryptoExchangeList: [
        { id: 'binance', name: 'Binance', docsUrl: 'https://www.binance.com/en/support/faq/detail/360002502072' },
        { id: 'okx', name: 'OKX', docsUrl: 'https://www.okx.com/docs-v5/zh/#overview-v5-api-key-creation' },
        { id: 'bitget', name: 'Bitget', docsUrl: 'https://www.bitget.com/api-doc/common/quick-start' },
        { id: 'bybit', name: 'Bybit', docsUrl: 'https://www.bybit.com/en/help-center/article/How-to-create-your-API-key/' },
        { id: 'coinbaseexchange', name: 'Coinbase', docsUrl: 'https://docs.cdp.coinbase.com/exchange/rest-api/authentication' },
        { id: 'kraken', name: 'Kraken', docsUrl: 'https://support.kraken.com/articles/360000919966-how-to-create-an-api-key' },
        { id: 'kucoin', name: 'KuCoin', docsUrl: 'https://www.kucoin.com/docs-new/authentication' },
        { id: 'gate', name: 'Gate.io', docsUrl: 'https://www.gate.com/docs/developers/apiv4/' },
        { id: 'bitfinex', name: 'Bitfinex', docsUrl: 'https://docs.bitfinex.com/docs/create-an-api-key' },
        { id: 'deepcoin', name: 'Deepcoin', docsUrl: 'https://www.deepcoin.com/docs/authentication' },
        { id: 'htx', name: 'HTX', docsUrl: 'https://www.htx.com/en-us/opend/newApiPages/?id=414' }
      ]
    }
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme
    }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    modalWrapClass () {
      const base = 'profile-exchange-modal'
      return this.isDarkTheme ? `${base} ${base}--dark` : base
    },
    /** 浅色也带基础类，便于 z-index 高于弹窗层（否则下拉在 Modal 后面）；暗色类名与下方 less 一致 */
    exchangeSelectDropdownClass () {
      const base = 'profile-exchange-select-dropdown'
      return this.isDarkTheme ? `${base} profile-exchange-select-dropdown-dark` : base
    },
    addExchangeNeedsPassphrase () {
      return ['okx', 'bitget', 'kucoin'].includes(this.selectedExchangeId)
    },
    addExchangeShowDemo () {
      return this.addExchangeType === 'crypto' && !!this.selectedExchangeId
    },
    selectedCryptoExchangeMeta () {
      return this.cryptoExchangeList.find(item => item.id === this.selectedExchangeId) || null
    },
    selectedCryptoExchangeName () {
      return this.selectedCryptoExchangeMeta ? this.selectedCryptoExchangeMeta.name : this.getExchangeDisplayName(this.selectedExchangeId)
    },
    selectedExchangeApiDocUrl () {
      return this.selectedCryptoExchangeMeta ? this.selectedCryptoExchangeMeta.docsUrl : ''
    },
    /** Server turned off IBKR/MT5 (e.g. SaaS); options disabled. */
    desktopBrokersBlockDesktop () {
      return !this.desktopPolicyLoading && !this.desktopBrokersAllowed
    },
    testingDesktopBlocked () {
      return this.desktopBrokersBlockDesktop && (this.addExchangeType === 'ibkr' || this.addExchangeType === 'mt5')
    },
    saveDesktopBlocked () {
      return this.testingDesktopBlocked
    }
  },
  watch: {
    visible (open) {
      if (open) {
        this.fetchEgressIp()
        this.fetchDesktopBrokersPolicy()
      }
    }
  },
  beforeCreate () {
    this.exchangeForm = this.$form.createForm(this, { name: 'exchangeAccountModal' })
  },
  methods: {
    exchangeModalGetContainer () {
      if (typeof this.overlayMount === 'function') {
        const n = this.overlayMount()
        return n || document.body
      }
      return document.body
    },
    getExchangeSelectPopupContainer () {
      return this.exchangeModalGetContainer()
    },
    handleCancel () {
      this.$emit('update:visible', false)
    },
    getExchangeDisplayName (id) {
      const names = {
        binance: 'Binance',
        okx: 'OKX',
        bitget: 'Bitget',
        bybit: 'Bybit',
        coinbaseexchange: 'Coinbase',
        kraken: 'Kraken',
        kucoin: 'KuCoin',
        gate: 'Gate.io',
        bitfinex: 'Bitfinex',
        deepcoin: 'Deepcoin',
        htx: 'HTX',
        ibkr: 'IBKR',
        mt5: 'MetaTrader 5'
      }
      return names[id] || id
    },
    async fetchDesktopBrokersPolicy () {
      this.desktopPolicyLoading = true
      this.desktopBrokersDisabledMessage = ''
      try {
        const res = await getDesktopBrokersPolicy()
        if (res.code === 1 && res.data) {
          this.desktopBrokersAllowed = !!res.data.allow_local_desktop_brokers
          this.desktopBrokersDisabledMessage = res.data.disabled_message || ''
        } else {
          this.desktopBrokersAllowed = true
        }
      } catch (e) {
        // Older backend without route: do not block local brokers.
        this.desktopBrokersAllowed = true
      } finally {
        this.desktopPolicyLoading = false
        this._clearDesktopBrokerSelectionIfBlocked()
      }
    },
    _clearDesktopBrokerSelectionIfBlocked () {
      if (this.desktopBrokersAllowed || !this.exchangeForm) return
      const ex = this.exchangeForm.getFieldValue('exchange_id')
      if (ex === 'ibkr' || ex === 'mt5') {
        this.exchangeForm.setFieldsValue({ exchange_id: undefined })
        this.addExchangeType = ''
        this.selectedExchangeId = ''
        this.exchangeTestResult = null
      }
    },
    _validateFieldNamesForSave () {
      const f = ['exchange_id']
      if (this.addExchangeType === 'crypto') {
        f.push('api_key', 'secret_key')
        if (this.addExchangeNeedsPassphrase) f.push('passphrase')
      } else if (this.addExchangeType === 'ibkr') {
        f.push('ibkr_host', 'ibkr_port', 'ibkr_client_id')
      } else if (this.addExchangeType === 'mt5') {
        f.push('mt5_server', 'mt5_login', 'mt5_password')
      }
      return f
    },
    _validateFieldNamesForTest () {
      if (this.addExchangeType === 'crypto') {
        const f = ['exchange_id', 'api_key', 'secret_key']
        if (this.addExchangeNeedsPassphrase) f.push('passphrase')
        return f
      }
      if (this.addExchangeType === 'ibkr') {
        return ['exchange_id', 'ibkr_host', 'ibkr_port', 'ibkr_client_id']
      }
      if (this.addExchangeType === 'mt5') {
        return ['exchange_id', 'mt5_server', 'mt5_login', 'mt5_password']
      }
      return ['exchange_id']
    },
    _normalizeCredentialPayload (values) {
      const p = { ...values }
      if (p.exchange_id === 'mt5' && p.mt5_login != null && p.mt5_login !== '') {
        p.mt5_login = String(p.mt5_login)
      }
      // validateFields(部分字段名) 返回的 values 往往只含参与校验的项，不含「模拟盘/测试网」勾选，
      // 会导致 test-connection 与保存凭证时永远不带 enable_demo_trading。
      if (this.addExchangeType === 'crypto' && this.exchangeForm) {
        try {
          const demo = this.exchangeForm.getFieldValue('enable_demo_trading')
          if (demo !== undefined && demo !== null) {
            p.enable_demo_trading = !!demo
          }
        } catch (e) {
          // ignore
        }
      }
      return p
    },
    async fetchEgressIp () {
      this.egressIpLoading = true
      this.egressServerIpv4 = ''
      this.egressServerIpv6 = ''
      try {
        const res = await getCredentialsEgressIp()
        if (res.code === 1 && res.data) {
          const v4 = res.data.ipv4 != null ? String(res.data.ipv4).trim() : ''
          const v6 = res.data.ipv6 != null ? String(res.data.ipv6).trim() : ''
          this.egressServerIpv4 = v4
          this.egressServerIpv6 = v6
          if (!v4 && !v6 && res.data.ip) {
            const legacy = String(res.data.ip).trim()
            if (legacy.includes(':')) {
              this.egressServerIpv6 = legacy
            } else {
              this.egressServerIpv4 = legacy
            }
          }
        }
      } catch (e) {
        this.egressServerIpv4 = ''
        this.egressServerIpv6 = ''
      } finally {
        this.egressIpLoading = false
      }
    },
    copyEgressIp (kind) {
      const ip = kind === 'v6' ? this.egressServerIpv6 : this.egressServerIpv4
      if (!ip) return
      const ok = () => this.$message.success(this.$t('profile.exchange.whitelistIpCopied'))
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ip).then(ok).catch(() => this._fallbackCopyText(ip, ok))
      } else {
        this._fallbackCopyText(ip, ok)
      }
    },
    _fallbackCopyText (text, onOk) {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        if (onOk) onOk()
      } catch (e) {
        this.$message.error(this.$t('profile.exchange.whitelistIpCopyFail'))
      }
    },
    handleExchangeTypeChange (val) {
      this.selectedExchangeId = val
      this.exchangeTestResult = null
      const cryptoIds = this.cryptoExchangeList.map(e => e.id)
      if (cryptoIds.includes(val)) {
        this.addExchangeType = 'crypto'
      } else if (val === 'ibkr') {
        this.addExchangeType = 'ibkr'
      } else if (val === 'mt5') {
        this.addExchangeType = 'mt5'
      } else {
        this.addExchangeType = ''
      }
    },
    openSelectedExchangeApiDoc () {
      const url = this.selectedExchangeApiDocUrl
      if (url) window.open(url, '_blank')
    },
    handleSaveExchange () {
      const names = this._validateFieldNamesForSave()
      this.exchangeForm.validateFields(names, async (err, values) => {
        if (err) return
        if (this.testingDesktopBlocked) {
          this.$message.error(this.desktopBrokersDisabledMessage || this.$t('profile.exchange.desktopBrokersDisabledFallback'))
          return
        }
        this.savingExchange = true
        try {
          const payload = this._normalizeCredentialPayload(values)
          const res = await createExchangeCredential(payload)
          if (res.code === 1) {
            this.$message.success(this.$t('profile.exchange.saveSuccess'))
            this.$emit('update:visible', false)
            this.exchangeForm.resetFields()
            this.addExchangeType = ''
            this.selectedExchangeId = ''
            this.exchangeTestResult = null
            this.$emit('success', res.data)
          } else {
            this.$message.error(res.msg || this.$t('profile.exchange.saveFailed'))
          }
        } catch (e) {
          this.$message.error(e.message || this.$t('profile.exchange.saveFailed'))
        } finally {
          this.savingExchange = false
        }
      })
    },
    async handleTestExchangeConnection () {
      if (this.testingDesktopBlocked) {
        this.$message.error(this.desktopBrokersDisabledMessage || this.$t('profile.exchange.desktopBrokersDisabledFallback'))
        return
      }
      const names = this._validateFieldNamesForTest()
      this.exchangeForm.validateFields(names, async (err, values) => {
        if (err) return
        const exchangeId = values.exchange_id
        if (!exchangeId) return

        this.testingExchange = true
        this.exchangeTestResult = null
        try {
          const payload = this._normalizeCredentialPayload(values)
          const res = await testExchangeConnection(payload)
          if (res.code === 1) {
            this.exchangeTestResult = {
              success: true,
              message: res.msg || this.$t('profile.exchange.testSuccess')
            }
          } else {
            const hint = (res.data && res.data.hint_cn) ? ` ${res.data.hint_cn}` : ''
            this.exchangeTestResult = {
              success: false,
              message: `${this.$t('profile.exchange.testFailed')}: ${res.msg || 'Unknown error'}${hint}`
            }
          }
        } catch (e) {
          this.exchangeTestResult = {
            success: false,
            message: `${this.$t('profile.exchange.testFailed')}: ${e.message || 'Network error'}`
          }
        } finally {
          this.testingExchange = false
        }
      })
    }
  }
}
</script>

<style lang="less">
/* 弹窗挂载在 body，须非 scoped；与个人中心一致，保证闪电交易等页打开也有样式 */
@exchange-dark-bg: #1c1c1c;
@exchange-dark-border: #2a2a2a;
@exchange-dark-input: #141414;
@exchange-dark-text: #c9d1d9;
@exchange-dark-muted: #8b949e;
@exchange-dark-title: #e0e6ed;

.profile-exchange-modal .exchange-account-form {
  .exchange-option-cloud-hint {
    margin-left: 4px;
    font-size: 11px;
    font-weight: normal;
    opacity: 0.75;
  }

  .egress-ip-block {
    width: 100%;
  }

  .exchange-api-doc-callout {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 0 0 16px;
    padding: 12px 14px;
    border: 1px solid rgba(24, 144, 255, 0.18);
    border-radius: 10px;
    background: linear-gradient(90deg, rgba(24, 144, 255, 0.06) 0%, rgba(82, 196, 26, 0.04) 100%);
  }

  .exchange-api-doc-callout__content {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-width: 0;
  }

  .exchange-api-doc-callout__icon {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(24, 144, 255, 0.12);
    color: #1890ff;
    flex: 0 0 auto;
  }

  .exchange-api-doc-callout__text {
    min-width: 0;
  }

  .exchange-api-doc-callout__title {
    color: rgba(0, 0, 0, 0.85);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.5;
  }

  .exchange-api-doc-callout__hint {
    color: rgba(0, 0, 0, 0.55);
    font-size: 12px;
    line-height: 1.5;
    margin-top: 2px;
  }

  .exchange-api-doc-callout__action {
    padding: 0;
    white-space: nowrap;
    flex: 0 0 auto;
  }

  .egress-ip-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
  }

  .egress-ip-refresh-row {
    margin-top: 4px;
  }

  .egress-ip-line {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 10px;
  }

  .egress-ip-kind {
    flex: 0 0 auto;
    min-width: 42px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.55);
  }

  .egress-ip-value {
    flex: 1 1 160px;
    min-width: 0;
    font-family: Consolas, ui-monospace, monospace;
    font-size: 12px;
    padding: 6px 10px;
    border-radius: 4px;
    border: 1px solid #d9d9d9;
    background: #fafafa;
    color: #262626;
    word-break: break-all;
  }

  .exchange-demo-checkbox-label {
    color: rgba(0, 0, 0, 0.85);
  }

  .exchange-demo-hint {
    margin-top: 6px;
  }

  .field-hint {
    margin-top: 6px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }

  .test-result-msg {
    margin-top: 8px;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
    &.success {
      color: #52c41a;
    }
    &.error {
      color: #f5222d;
    }
  }
}

.profile-exchange-modal--dark {
  .ant-modal-content {
    background: @exchange-dark-bg;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  }

  .ant-modal-header {
    background: @exchange-dark-bg;
    border-bottom: 1px solid @exchange-dark-border;
  }

  .ant-modal-title {
    color: @exchange-dark-title;
  }

  .ant-modal-close {
    color: @exchange-dark-muted;

    &:hover {
      color: @exchange-dark-text;
    }
  }

  .ant-modal-body {
    color: @exchange-dark-text;
  }

  .ant-modal-footer {
    background: @exchange-dark-bg;
    border-top: 1px solid @exchange-dark-border;
  }

  .exchange-account-form {
    .ant-form-item-label > label {
      color: @exchange-dark-text;
    }

    .ant-form-item-explain,
    .ant-form-item-extra {
      color: @exchange-dark-muted;
    }

    .ant-input,
    .ant-input-password .ant-input,
    .ant-input-number,
    .ant-input-number-input {
      background: @exchange-dark-input !important;
      border-color: @exchange-dark-border !important;
      color: @exchange-dark-text !important;
    }

    .ant-input-password-icon {
      color: @exchange-dark-muted;
    }

    .ant-input-number-handler-wrap {
      background: @exchange-dark-input;
      border-left-color: @exchange-dark-border;
    }

    .ant-input-number-handler-down-inner,
    .ant-input-number-handler-up-inner {
      color: @exchange-dark-muted;
    }

    .ant-select-selector {
      background: @exchange-dark-input !important;
      border-color: @exchange-dark-border !important;
      color: @exchange-dark-text !important;
    }

    .ant-select-selection-item,
    .ant-select-selection-placeholder {
      color: @exchange-dark-text !important;
    }

    .ant-select-selection,
    .ant-select-selection--single {
      background: @exchange-dark-input !important;
      border-color: @exchange-dark-border !important;
    }

    .ant-select-selection__rendered,
    .ant-select-selection-selected-value,
    .ant-select-selection-placeholder {
      color: @exchange-dark-text !important;
    }

    .ant-select-arrow {
      color: @exchange-dark-muted;
    }

    .ant-checkbox-wrapper {
      color: @exchange-dark-text;

      span {
        color: @exchange-dark-text;
      }
    }

    .exchange-demo-checkbox-label {
      color: @exchange-dark-text !important;
    }

    .exchange-demo-hint,
    .egress-ip-hint {
      color: @exchange-dark-muted !important;
    }

    .exchange-api-doc-callout {
      background: linear-gradient(90deg, rgba(24, 144, 255, 0.12) 0%, rgba(82, 196, 26, 0.08) 100%);
      border-color: rgba(88, 166, 255, 0.26);
    }

    .exchange-api-doc-callout__icon {
      background: rgba(88, 166, 255, 0.16);
      color: #58a6ff;
    }

    .exchange-api-doc-callout__title {
      color: @exchange-dark-title;
    }

    .exchange-api-doc-callout__hint {
      color: @exchange-dark-muted;
    }

    .exchange-api-doc-callout__action {
      color: #58a6ff;
    }

    .egress-ip-value {
      border-color: @exchange-dark-border !important;
      background: @exchange-dark-input !important;
      color: @exchange-dark-title !important;
    }

    a.egress-ip-action {
      color: #58a6ff;
    }

    .egress-ip-kind {
      color: @exchange-dark-muted !important;
    }

    .ant-alert {
      background: rgba(250, 173, 20, 0.12);
      border-color: rgba(250, 173, 20, 0.45);
    }

    .ant-alert-message {
      color: #ffc53d;
    }

    .ant-alert-description {
      color: @exchange-dark-muted;
    }

    .ant-alert-icon {
      color: #faad14;
    }

    .field-hint {
      color: @exchange-dark-muted;
      margin-top: 6px;
      font-size: 12px;
      display: flex;
      align-items: flex-start;
      gap: 6px;

      .anticon {
        color: @exchange-dark-muted;
        margin-top: 2px;
      }
    }

    .test-result-msg {
      color: @exchange-dark-text;

      &.success {
        color: #73d13d;
      }

      &.error {
        color: #ff7875;
      }
    }
  }
}

.profile-exchange-select-dropdown-dark.ant-select-dropdown {
  background: @exchange-dark-bg;

  .ant-select-dropdown-menu-item {
    color: @exchange-dark-text;
  }

  .ant-select-dropdown-menu-item:hover {
    background: #2a2a2a;
  }

  .ant-select-dropdown-menu-item-selected {
    background: #2a2a2a !important;
    color: @exchange-dark-title;
    font-weight: 500;
  }

  .ant-select-dropdown-menu-item-group-title {
    color: @exchange-dark-muted !important;
    font-size: 12px;
  }

  .ant-select-dropdown-menu-item,
  .ant-select-dropdown-menu-item-selected {
    color: @exchange-dark-text !important;
  }

  .ant-empty-description {
    color: @exchange-dark-muted;
  }
}
</style>

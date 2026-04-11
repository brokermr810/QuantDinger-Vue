<template>
  <a-form-model
    ref="form"
    :model="form"
    :rules="rules"
    :label-col="{ span: 8 }"
    :wrapper-col="{ span: 14 }"
  >
    <a-form-model-item :label="$t('trading-bot.martingale.initialAmount')" prop="initialAmount">
      <a-input-number
        v-model="form.initialAmount"
        :min="1"
        :step="10"
        style="width: 100%"
        :placeholder="$t('trading-bot.martingale.initialAmountPh')"
        @change="handleAmountManualChange"
      />
      <div v-if="capitalLinked && initialCapital" class="capital-hint">
        <a-icon type="link" /> {{ $t('trading-bot.grid.autoCalcHint') }}
      </div>
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.martingale.multiplier')" prop="multiplier">
      <a-input-number
        v-model="form.multiplier"
        :min="1.1"
        :max="10"
        :step="0.1"
        style="width: 100%"
        @change="emit"
      />
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.martingale.maxLayers')" prop="maxLayers">
      <a-input-number
        v-model="form.maxLayers"
        :min="1"
        :max="20"
        :step="1"
        style="width: 100%"
        @change="emit"
      />
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.martingale.priceDropPct')" prop="priceDropPct">
      <a-input-number
        v-model="form.priceDropPct"
        :min="0.1"
        :max="50"
        :step="0.5"
        style="width: 100%"
        :formatter="v => `${v}%`"
        :parser="v => v.replace('%', '')"
        @change="emit"
      />
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.martingale.takeProfitPct')" prop="takeProfitPct">
      <a-input-number
        v-model="form.takeProfitPct"
        :min="0.1"
        :max="100"
        :step="0.5"
        style="width: 100%"
        :formatter="v => `${v}%`"
        :parser="v => v.replace('%', '')"
        @change="emit"
      />
    </a-form-model-item>
    <div
      class="config-summary"
      v-if="form.initialAmount && form.multiplier && form.maxLayers"
    >
      <div class="summary-item">
        <span class="label">{{ $t('trading-bot.martingale.maxInvest') }}</span>
        <span class="value">${{ maxInvestment }}</span>
      </div>
      <div class="summary-item">
        <span class="label">{{ $t('trading-bot.martingale.lastLayerAmt') }}</span>
        <span class="value">${{ lastLayerAmount }}</span>
      </div>
    </div>
  </a-form-model>
</template>

<script>
export default {
  name: 'MartingaleConfig',
  props: {
    value: { type: Object, default: () => ({}) },
    initialCapital: { type: Number, default: null }
  },
  data () {
    return {
      form: {
        initialAmount: this.value.initialAmount || null,
        multiplier: this.value.multiplier || 2,
        maxLayers: this.value.maxLayers || 5,
        priceDropPct: this.value.priceDropPct || 3,
        takeProfitPct: this.value.takeProfitPct || 5
      },
      capitalLinked: !this.value.initialAmount,
      rules: {
        initialAmount: [{ required: true, message: this.$t('trading-bot.martingale.initialAmountReq'), trigger: 'change' }],
        multiplier: [{ required: true, message: this.$t('trading-bot.martingale.multiplierReq'), trigger: 'change' }],
        maxLayers: [{ required: true, message: this.$t('trading-bot.martingale.maxLayersReq'), trigger: 'change' }],
        priceDropPct: [{ required: true, message: this.$t('trading-bot.martingale.priceDropReq'), trigger: 'change' }],
        takeProfitPct: [{ required: true, message: this.$t('trading-bot.martingale.takeProfitReq'), trigger: 'change' }]
      }
    }
  },
  watch: {
    initialCapital (val) {
      if (val && val > 0 && this.capitalLinked) {
        this.recalcInitialAmount(val)
      }
    },
    'form.multiplier' () {
      if (this.initialCapital && this.capitalLinked) this.recalcInitialAmount(this.initialCapital)
    },
    'form.maxLayers' () {
      if (this.initialCapital && this.capitalLinked) this.recalcInitialAmount(this.initialCapital)
    }
  },
  computed: {
    maxInvestment () {
      let total = 0
      let amt = this.form.initialAmount
      for (let i = 0; i < this.form.maxLayers; i++) {
        total += amt
        amt *= this.form.multiplier
      }
      return total.toLocaleString('en-US', { minimumFractionDigits: 2 })
    },
    lastLayerAmount () {
      const amt = this.form.initialAmount * Math.pow(this.form.multiplier, this.form.maxLayers - 1)
      return amt.toLocaleString('en-US', { minimumFractionDigits: 2 })
    }
  },
  methods: {
    recalcInitialAmount (capital) {
      let geoSum = 0
      for (let i = 0; i < this.form.maxLayers; i++) {
        geoSum += Math.pow(this.form.multiplier, i)
      }
      this.form.initialAmount = Math.max(1, Math.floor(capital / geoSum))
      this.emit()
    },
    handleAmountManualChange () {
      this.capitalLinked = false
      this.emit()
    },
    emit () {
      this.$emit('input', { ...this.form })
      this.$emit('change', { ...this.form })
    },
    validate () {
      return new Promise((resolve, reject) => {
        this.$refs.form.validate(valid => {
          valid ? resolve(this.form) : reject(new Error('validation failed'))
        })
      })
    }
  }
}
</script>

<style lang="less" scoped>
.capital-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #8c8c8c;
}

.config-summary {
  margin-top: 8px;
  padding: 12px 16px;
  background: rgba(245, 34, 45, 0.04);
  border: 1px dashed rgba(245, 34, 45, 0.3);
  border-radius: 8px;

  .summary-item {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 13px;

    .label { color: #8c8c8c; }
    .value { font-weight: 600; color: #262626; }
  }
}
</style>

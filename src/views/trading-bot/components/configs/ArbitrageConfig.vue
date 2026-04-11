<template>
  <a-form-model
    ref="form"
    :model="form"
    :rules="rules"
    :label-col="{ span: 8 }"
    :wrapper-col="{ span: 14 }"
  >
    <a-form-model-item :label="$t('trading-bot.arb.exchangeA')" prop="exchangeA">
      <a-select
        v-model="form.exchangeA"
        :placeholder="$t('trading-bot.arb.selectExchange')"
        @change="emit"
      >
        <a-select-option value="binance">Binance</a-select-option>
        <a-select-option value="bybit">Bybit</a-select-option>
        <a-select-option value="gate">Gate.io</a-select-option>
        <a-select-option value="okx">OKX</a-select-option>
      </a-select>
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.arb.exchangeB')" prop="exchangeB">
      <a-select
        v-model="form.exchangeB"
        :placeholder="$t('trading-bot.arb.selectExchange')"
        @change="emit"
      >
        <a-select-option value="binance">Binance</a-select-option>
        <a-select-option value="bybit">Bybit</a-select-option>
        <a-select-option value="gate">Gate.io</a-select-option>
        <a-select-option value="okx">OKX</a-select-option>
      </a-select>
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.arb.minSpreadPct')" prop="minSpreadPct">
      <a-input-number
        v-model="form.minSpreadPct"
        :min="0.01"
        :max="10"
        :step="0.05"
        style="width: 100%"
        :formatter="v => `${v}%`"
        :parser="v => v.replace('%', '')"
        @change="emit"
      />
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.arb.tradeAmount')" prop="tradeAmount">
      <a-input-number
        v-model="form.tradeAmount"
        :min="1"
        :step="10"
        style="width: 100%"
        :placeholder="$t('trading-bot.arb.tradeAmountPh')"
        @change="emit"
      />
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.arb.maxPositionSize')">
      <a-input-number
        v-model="form.maxPositionSize"
        :min="0"
        :step="100"
        style="width: 100%"
        @change="emit"
      />
    </a-form-model-item>
  </a-form-model>
</template>

<script>
export default {
  name: 'ArbitrageConfig',
  props: {
    value: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      form: {
        exchangeA: this.value.exchangeA || undefined,
        exchangeB: this.value.exchangeB || undefined,
        minSpreadPct: this.value.minSpreadPct || 0.3,
        tradeAmount: this.value.tradeAmount || 100,
        maxPositionSize: this.value.maxPositionSize || 5000
      },
      rules: {
        exchangeA: [{ required: true, message: this.$t('trading-bot.arb.exchangeAReq'), trigger: 'change' }],
        exchangeB: [{ required: true, message: this.$t('trading-bot.arb.exchangeBReq'), trigger: 'change' }],
        minSpreadPct: [{ required: true, message: this.$t('trading-bot.arb.minSpreadReq'), trigger: 'change' }],
        tradeAmount: [{ required: true, message: this.$t('trading-bot.arb.tradeAmountReq'), trigger: 'change' }]
      }
    }
  },
  methods: {
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

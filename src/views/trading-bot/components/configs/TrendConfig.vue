<template>
  <a-form-model
    ref="form"
    :model="form"
    :rules="rules"
    :label-col="{ span: 8 }"
    :wrapper-col="{ span: 14 }"
  >
    <a-form-model-item :label="$t('trading-bot.trend.maPeriod')" prop="maPeriod">
      <a-input-number
        v-model="form.maPeriod"
        :min="5"
        :max="500"
        :step="1"
        style="width: 100%"
        @change="emit"
      />
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.trend.maType')">
      <a-select v-model="form.maType" @change="emit">
        <a-select-option value="EMA">EMA</a-select-option>
        <a-select-option value="SMA">SMA</a-select-option>
        <a-select-option value="WMA">WMA</a-select-option>
      </a-select>
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.trend.confirmBars')" prop="confirmBars">
      <a-input-number
        v-model="form.confirmBars"
        :min="1"
        :max="10"
        :step="1"
        style="width: 100%"
        @change="emit"
      />
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.trend.positionPct')" prop="positionPct">
      <a-slider
        v-model="form.positionPct"
        :min="5"
        :max="100"
        :step="5"
        :tipFormatter="v => `${v}%`"
        @change="emit"
      />
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.trend.timeframe')">
      <a-select v-model="form.timeframe" @change="emit">
        <a-select-option value="1m">1 {{ $t('trading-bot.timeframe.min') }}</a-select-option>
        <a-select-option value="5m">5 {{ $t('trading-bot.timeframe.min') }}</a-select-option>
        <a-select-option value="15m">15 {{ $t('trading-bot.timeframe.min') }}</a-select-option>
        <a-select-option value="1h">1 {{ $t('trading-bot.timeframe.hour') }}</a-select-option>
        <a-select-option value="4h">4 {{ $t('trading-bot.timeframe.hour') }}</a-select-option>
        <a-select-option value="1d">1 {{ $t('trading-bot.timeframe.day') }}</a-select-option>
      </a-select>
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.trend.direction')">
      <a-radio-group v-model="form.direction" @change="emit">
        <a-radio value="long">{{ $t('trading-bot.trend.longOnly') }}</a-radio>
        <a-radio value="short">{{ $t('trading-bot.trend.shortOnly') }}</a-radio>
        <a-radio value="both">{{ $t('trading-bot.trend.bothSides') }}</a-radio>
      </a-radio-group>
    </a-form-model-item>
  </a-form-model>
</template>

<script>
export default {
  name: 'TrendConfig',
  props: {
    value: { type: Object, default: () => ({}) },
    initialCapital: { type: Number, default: null }
  },
  data () {
    return {
      form: {
        maPeriod: this.value.maPeriod || 20,
        maType: this.value.maType || 'EMA',
        confirmBars: this.value.confirmBars || 2,
        positionPct: this.value.positionPct || 50,
        timeframe: this.value.timeframe || '1h',
        direction: this.value.direction || 'long'
      },
      rules: {
        maPeriod: [{ required: true, message: this.$t('trading-bot.trend.maPeriodReq'), trigger: 'change' }],
        confirmBars: [{ required: true, message: this.$t('trading-bot.trend.confirmBarsReq'), trigger: 'change' }],
        positionPct: [{ required: true, message: this.$t('trading-bot.trend.positionPctReq'), trigger: 'change' }]
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

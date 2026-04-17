<template>
  <a-form-model
    ref="form"
    :model="form"
    :rules="rules"
    :label-col="{ span: 8 }"
    :wrapper-col="{ span: 14 }"
  >
    <a-form-model-item :label="$t('trading-bot.grid.upperPrice')" prop="upperPrice">
      <a-input-number
        v-model="form.upperPrice"
        :min="0"
        :step="0.01"
        style="width: 100%"
        :placeholder="$t('trading-bot.grid.upperPricePh')"
        @change="emit"
      />
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.grid.lowerPrice')" prop="lowerPrice">
      <a-input-number
        v-model="form.lowerPrice"
        :min="0"
        :step="0.01"
        style="width: 100%"
        :placeholder="$t('trading-bot.grid.lowerPricePh')"
        @change="emit"
      />
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.grid.gridCount')" prop="gridCount">
      <a-input-number
        v-model="form.gridCount"
        :min="2"
        :max="500"
        :step="1"
        style="width: 100%"
        @change="emit"
      />
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.grid.amountPerGrid')" prop="amountPerGrid">
      <a-input-number
        v-model="form.amountPerGrid"
        :min="1"
        :step="1"
        style="width: 100%"
        :placeholder="$t('trading-bot.grid.amountPerGridPh')"
        @change="handleAmountManualChange"
      />
      <div v-if="capitalLinked && initialCapital" class="direction-hint">
        <a-icon type="link" /> {{ $t('trading-bot.grid.autoCalcHint') }}
      </div>
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.grid.mode')">
      <a-radio-group v-model="form.gridMode" @change="emit">
        <a-radio value="arithmetic">{{ $t('trading-bot.grid.arithmetic') }}</a-radio>
        <a-radio value="geometric">{{ $t('trading-bot.grid.geometric') }}</a-radio>
      </a-radio-group>
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.grid.direction')">
      <a-radio-group v-model="form.gridDirection" @change="emit">
        <a-radio value="neutral" :disabled="isSpotMarket">{{ $t('trading-bot.grid.neutral') }}</a-radio>
        <a-radio value="long">{{ $t('trading-bot.grid.long') }}</a-radio>
        <a-radio value="short" :disabled="isSpotMarket">{{ $t('trading-bot.grid.short') }}</a-radio>
      </a-radio-group>
      <div class="direction-hint">{{ directionHint }}</div>
    </a-form-model-item>
    <a-form-model-item :label="$t('trading-bot.grid.orderType')">
      <a-radio-group v-model="form.orderMode" @change="emit">
        <a-radio value="maker">{{ $t('trading-bot.grid.limitOrder') }}</a-radio>
        <a-radio value="market">{{ $t('trading-bot.grid.marketOrder') }}</a-radio>
      </a-radio-group>
      <div class="direction-hint">{{ orderModeHint }}</div>
    </a-form-model-item>
    <div
      class="config-summary"
      v-if="form.upperPrice && form.lowerPrice && form.gridCount"
    >
      <div class="summary-item">
        <span class="label">{{ $t('trading-bot.grid.gridSpacing') }}</span>
        <span class="value">{{ gridSpacing }}</span>
      </div>
      <div class="summary-item">
        <span class="label">{{ $t('trading-bot.grid.totalInvest') }}</span>
        <span class="value">${{ totalInvestment }}</span>
      </div>
    </div>
  </a-form-model>
</template>

<script>
export default {
  name: 'GridConfig',
  props: {
    value: { type: Object, default: () => ({}) },
    initialCapital: { type: Number, default: null },
    marketType: { type: String, default: 'swap' }
  },
  data () {
    return {
      form: {
        upperPrice: this.value.upperPrice || null,
        lowerPrice: this.value.lowerPrice || null,
        gridCount: this.value.gridCount || 10,
        amountPerGrid: this.value.amountPerGrid || null,
        gridMode: this.value.gridMode || 'arithmetic',
        gridDirection: this.value.gridDirection || 'neutral',
        orderMode: this.value.orderMode || 'maker'
      },
      capitalLinked: !this.value.amountPerGrid,
      rules: {
        upperPrice: [
          { required: true, message: this.$t('trading-bot.grid.upperPriceReq'), trigger: 'change' },
          { validator: this.validateUpperPrice, trigger: 'change' }
        ],
        lowerPrice: [
          { required: true, message: this.$t('trading-bot.grid.lowerPriceReq'), trigger: 'change' },
          { validator: this.validateLowerPrice, trigger: 'change' }
        ],
        gridCount: [{ required: true, message: this.$t('trading-bot.grid.gridCountReq'), trigger: 'change' }],
        amountPerGrid: [
          { required: true, message: this.$t('trading-bot.grid.amountReq'), trigger: 'change' },
          { validator: this.validateAmountPerGrid, trigger: 'change' }
        ]
      }
    }
  },
  watch: {
    initialCapital (val) {
      if (val && val > 0 && this.form.gridCount > 0 && this.capitalLinked) {
        this.form.amountPerGrid = Math.floor(val / this.form.gridCount)
        this.emit()
      }
    },
    'form.gridCount' (val) {
      if (this.initialCapital && this.initialCapital > 0 && val > 0 && this.capitalLinked) {
        this.form.amountPerGrid = Math.floor(this.initialCapital / val)
        this.emit()
      }
    },
    marketType: {
      immediate: true,
      handler (val) {
        if (val === 'spot' && this.form.gridDirection !== 'long') {
          this.form.gridDirection = 'long'
          this.emit()
        }
      }
    }
  },
  computed: {
    isSpotMarket () {
      return this.marketType === 'spot'
    },
    gridSpacing () {
      if (!this.form.upperPrice || !this.form.lowerPrice || !this.form.gridCount) return '-'
      if (this.form.gridMode === 'geometric' && this.form.lowerPrice > 0) {
        const ratio = Math.pow(this.form.upperPrice / this.form.lowerPrice, 1 / this.form.gridCount)
        return `${((ratio - 1) * 100).toFixed(2)}%`
      }
      const spacing = ((this.form.upperPrice - this.form.lowerPrice) / this.form.gridCount).toFixed(4)
      return `$${spacing}`
    },
    totalInvestment () {
      if (!this.form.amountPerGrid || !this.form.gridCount) return '0'
      return (this.form.amountPerGrid * this.form.gridCount).toLocaleString('en-US', { minimumFractionDigits: 2 })
    },
    directionHint () {
      if (this.isSpotMarket) return 'Spot grid only supports long mode.'
      const map = {
        neutral: this.$t('trading-bot.grid.neutralHint'),
        long: this.$t('trading-bot.grid.longHint'),
        short: this.$t('trading-bot.grid.shortHint')
      }
      return map[this.form.gridDirection] || ''
    },
    orderModeHint () {
      return this.form.orderMode === 'maker'
        ? this.$t('trading-bot.grid.limitOrderHint')
        : this.$t('trading-bot.grid.marketOrderHint')
    }
  },
  methods: {
    handleAmountManualChange () {
      this.capitalLinked = false
      this.emit()
    },
    validateUpperPrice (rule, value, callback) {
      if (value == null || value === '') return callback()
      if (this.form.lowerPrice != null && value <= this.form.lowerPrice) {
        return callback(new Error(this.$t('trading-bot.grid.upperMustGtLower')))
      }
      callback()
    },
    validateLowerPrice (rule, value, callback) {
      if (value == null || value === '') return callback()
      if (this.form.gridMode === 'geometric' && value <= 0) {
        return callback(new Error(this.$t('trading-bot.grid.lowerMustGtZero')))
      }
      if (this.form.upperPrice != null && value >= this.form.upperPrice) {
        return callback(new Error(this.$t('trading-bot.grid.upperMustGtLower')))
      }
      callback()
    },
    validateAmountPerGrid (rule, value, callback) {
      if (value == null || value === '') return callback()
      if (this.initialCapital && this.form.gridCount) {
        const total = value * this.form.gridCount
        if (total > this.initialCapital + 1e-6) {
          return callback(new Error(this.$t('trading-bot.grid.amountExceedsBudget')))
        }
      }
      callback()
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
.direction-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #8c8c8c;
}

.config-summary {
  margin-top: 8px;
  padding: 12px 16px;
  background: rgba(24, 144, 255, 0.04);
  border: 1px dashed rgba(24, 144, 255, 0.3);
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

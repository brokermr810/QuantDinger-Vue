/**
 * 交易机器人预置策略脚本模板。
 * 每种机器人类型对应 on_init + on_bar Python 代码，参数由用户在向导中填写后注入顶部变量。
 * 运行时由后端 TradingExecutor 以 ScriptStrategy 方式执行。
 *
 * ctx API (StrategyScriptContext):
 *   ctx.param(name, default)       → 读取/初始化持久化参数
 *   ctx._params[name] = val        → 写入持久化参数
 *   ctx.bars(n)                    → 最近 n 根 K 线（ScriptBar: open/high/low/close/volume）
 *   ctx.position                   → ScriptPosition dict (side/size/entry_price)，bool(pos) 表示有仓位
 *   ctx.balance                    → 当前可用余额 (USDT)
 *   ctx.buy(price=, amount=)       → 买入信号（amount 为 USDT 名义金额）
 *   ctx.sell(price=, amount=)      → 卖出信号
 *   ctx.close_position()           → 平仓
 *   ctx.log(msg)                   → 日志
 */

const TIMEFRAME_MINUTES = {
  '1m': 1, '5m': 5, '15m': 15, '1h': 60, '4h': 240, '1d': 1440
}

const FREQUENCY_MINUTES = {
  hourly: 60, daily: 1440, weekly: 10080, biweekly: 20160, monthly: 43200
}

export const BOT_SCRIPT_TEMPLATES = {

  // ========== 网格交易 ==========
  grid: (params) => `# ---- Grid Trading Bot ----
UPPER     = ${params.upperPrice}
LOWER     = ${params.lowerPrice}
GRIDS     = ${params.gridCount}
AMT       = ${params.amountPerGrid}
MODE      = "${params.gridMode || 'arithmetic'}"
DIRECTION = "${params.gridDirection || 'neutral'}"

def _build_levels():
    if MODE == "geometric" and LOWER > 0:
        r = (UPPER / LOWER) ** (1.0 / GRIDS)
        return [LOWER * (r ** i) for i in range(GRIDS + 1)]
    step = (UPPER - LOWER) / GRIDS
    return [LOWER + step * i for i in range(GRIDS + 1)]

LEVELS = _build_levels()

def _nearest_idx(price):
    best, dist = 0, abs(price - LEVELS[0])
    for i, lv in enumerate(LEVELS):
        d = abs(price - lv)
        if d < dist:
            best, dist = i, d
    return best

def on_init(ctx):
    ctx.param("prev_idx", -1)
    ctx.param("filled_buy", [])

def on_bar(ctx, bar):
    price = bar.close
    if price < LOWER or price > UPPER:
        return

    idx = _nearest_idx(price)
    prev = ctx.param("prev_idx", -1)
    filled = list(ctx.param("filled_buy", []))

    if prev < 0:
        ctx._params["prev_idx"] = idx
        return

    if idx == prev:
        return

    if idx < prev:
        for lvl_i in range(prev - 1, idx - 1, -1):
            if lvl_i not in filled:
                ctx.buy(price=LEVELS[lvl_i], amount=AMT)
                filled.append(lvl_i)
                ctx.log("BUY grid %d @ %.6f" % (lvl_i, LEVELS[lvl_i]))
    elif idx > prev:
        new_filled = []
        for lvl_i in filled:
            if lvl_i < idx:
                ctx.sell(price=LEVELS[lvl_i + 1], amount=AMT)
                ctx.log("SELL grid %d @ %.6f" % (lvl_i, LEVELS[lvl_i + 1]))
            else:
                new_filled.append(lvl_i)
        filled = new_filled

        if DIRECTION == "short" and len(filled) == 0:
            ctx.sell(price=LEVELS[idx], amount=AMT)
            filled.append(idx)
            ctx.log("SHORT grid %d @ %.6f" % (idx, LEVELS[idx]))

    if DIRECTION == "long" and len(filled) == 0 and idx < len(LEVELS) - 1:
        ctx.buy(price=LEVELS[idx], amount=AMT)
        filled.append(idx)
        ctx.log("LONG grid %d @ %.6f" % (idx, LEVELS[idx]))

    ctx._params["prev_idx"] = idx
    ctx._params["filled_buy"] = filled
`,

  // ========== 马丁格尔 ==========
  martingale: (params) => `# ---- Martingale Bot ----
INIT_AMT    = ${params.initialAmount}
MULTIPLIER  = ${params.multiplier}
MAX_LAYERS  = ${params.maxLayers}
DROP_PCT    = ${params.priceDropPct} / 100.0
TP_PCT      = ${params.takeProfitPct} / 100.0

def on_init(ctx):
    ctx.param("layer", 0)
    ctx.param("last_buy_price", 0.0)
    ctx.param("total_cost", 0.0)
    ctx.param("total_qty", 0.0)

def on_bar(ctx, bar):
    price = bar.close
    layer     = ctx.param("layer", 0)
    last_buy  = ctx.param("last_buy_price", 0.0)
    cost      = ctx.param("total_cost", 0.0)
    qty       = ctx.param("total_qty", 0.0)
    has_pos   = ctx.position and float(ctx.position.get("size", 0)) > 0

    if not has_pos and layer == 0:
        ctx.buy(price=price, amount=INIT_AMT)
        buy_qty = INIT_AMT / price if price > 0 else 0
        ctx._params["layer"] = 1
        ctx._params["last_buy_price"] = price
        ctx._params["total_cost"] = INIT_AMT
        ctx._params["total_qty"] = buy_qty
        ctx.log("Layer 1: BUY %.2f USDT @ %.6f" % (INIT_AMT, price))
        return

    if not has_pos:
        ctx._params["layer"] = 0
        ctx._params["total_cost"] = 0.0
        ctx._params["total_qty"] = 0.0
        ctx._params["last_buy_price"] = 0.0
        return

    avg_price = cost / qty if qty > 0 else last_buy
    if avg_price > 0 and price >= avg_price * (1 + TP_PCT):
        pnl = (price - avg_price) * qty
        ctx.log("TAKE PROFIT @ %.6f, avg=%.6f, PnL=%.2f USDT" % (price, avg_price, pnl))
        ctx.close_position()
        ctx._params["layer"] = 0
        ctx._params["total_cost"] = 0.0
        ctx._params["total_qty"] = 0.0
        ctx._params["last_buy_price"] = 0.0
        return

    if layer < MAX_LAYERS and last_buy > 0 and price <= last_buy * (1 - DROP_PCT):
        amt = INIT_AMT * (MULTIPLIER ** layer)
        buy_qty = amt / price if price > 0 else 0
        ctx.buy(price=price, amount=amt)
        ctx._params["layer"] = layer + 1
        ctx._params["last_buy_price"] = price
        ctx._params["total_cost"] = cost + amt
        ctx._params["total_qty"] = qty + buy_qty
        ctx.log("Layer %d: BUY %.2f USDT @ %.6f" % (layer + 1, amt, price))
`,

  // ========== 趋势跟踪 ==========
  trend: (params) => `# ---- Trend Following Bot ----
MA_PERIOD    = ${params.maPeriod}
MA_TYPE      = "${params.maType || 'EMA'}"
CONFIRM_BARS = ${params.confirmBars}
POS_PCT      = ${params.positionPct} / 100.0
DIRECTION    = "${params.direction || 'long'}"

def _sma(closes):
    if len(closes) < MA_PERIOD:
        return None
    return sum(closes[-MA_PERIOD:]) / MA_PERIOD

def _wma(closes):
    if len(closes) < MA_PERIOD:
        return None
    window = closes[-MA_PERIOD:]
    w = list(range(1, MA_PERIOD + 1))
    return sum(p * wt for p, wt in zip(window, w)) / sum(w)

def on_init(ctx):
    ctx.param("ema_value", 0.0)
    ctx.param("ema_ready", False)
    ctx.param("above_cnt", 0)
    ctx.param("below_cnt", 0)

def on_bar(ctx, bar):
    bars = ctx.bars(MA_PERIOD + 10)
    if len(bars) < MA_PERIOD:
        return

    closes = [b.close for b in bars]
    price = bar.close

    if MA_TYPE == "SMA":
        ma = _sma(closes)
    elif MA_TYPE == "WMA":
        ma = _wma(closes)
    else:
        ema_prev = ctx.param("ema_value", 0.0)
        ema_ok   = ctx.param("ema_ready", False)
        if not ema_ok:
            ma = sum(closes[-MA_PERIOD:]) / MA_PERIOD
            ctx._params["ema_value"] = ma
            ctx._params["ema_ready"] = True
        else:
            alpha = 2.0 / (MA_PERIOD + 1)
            ma = alpha * price + (1 - alpha) * ema_prev
            ctx._params["ema_value"] = ma

    if ma is None or ma <= 0:
        return

    above = ctx.param("above_cnt", 0)
    below = ctx.param("below_cnt", 0)

    if price > ma:
        above += 1
        below = 0
    elif price < ma:
        below += 1
        above = 0
    else:
        above = 0
        below = 0

    ctx._params["above_cnt"] = above
    ctx._params["below_cnt"] = below

    has_pos = ctx.position and float(ctx.position.get("size", 0)) > 0
    side = ctx.position.get("side", "") if has_pos else ""

    if DIRECTION in ("long", "both"):
        if not has_pos and above >= CONFIRM_BARS:
            amt = ctx.balance * POS_PCT
            if amt > 0:
                ctx.buy(price=price, amount=amt)
                ctx.log("LONG @ %.6f, MA=%.6f, above=%d" % (price, ma, above))
        elif has_pos and side == "long" and below >= CONFIRM_BARS:
            ctx.close_position()
            ctx.log("CLOSE LONG @ %.6f, MA=%.6f" % (price, ma))

    if DIRECTION in ("short", "both"):
        if not has_pos and below >= CONFIRM_BARS:
            amt = ctx.balance * POS_PCT
            if amt > 0:
                ctx.sell(price=price, amount=amt)
                ctx.log("SHORT @ %.6f, MA=%.6f, below=%d" % (price, ma, below))
        elif has_pos and side == "short" and above >= CONFIRM_BARS:
            ctx.close_position()
            ctx.log("CLOSE SHORT @ %.6f, MA=%.6f" % (price, ma))
`,

  // ========== 定投 DCA ==========
  dca: (params, context) => {
    const tf = (context && context.timeframe) || '1h'
    const tfMin = TIMEFRAME_MINUTES[tf] || 60
    const freqMin = FREQUENCY_MINUTES[params.frequency] || 1440
    const intervalBars = Math.max(1, Math.round(freqMin / tfMin))

    return `# ---- DCA (Dollar Cost Averaging) Bot ----
AMT_EACH       = ${params.amountEach}
TOTAL_BUDGET   = ${params.totalBudget || 0}
DIP_BUY        = ${params.dipBuyEnabled ? 'True' : 'False'}
DIP_THRESHOLD  = ${params.dipThreshold || 5} / 100.0
INTERVAL_BARS  = ${intervalBars}

def on_init(ctx):
    ctx.param("total_spent", 0.0)
    ctx.param("buy_count", 0)
    ctx.param("bar_count", 0)
    ctx.param("last_buy_price", 0.0)

def on_bar(ctx, bar):
    price       = bar.close
    total_spent = ctx.param("total_spent", 0.0)
    buy_count   = ctx.param("buy_count", 0)
    bar_count   = ctx.param("bar_count", 0)
    last_price  = ctx.param("last_buy_price", 0.0)

    bar_count += 1
    ctx._params["bar_count"] = bar_count

    if TOTAL_BUDGET > 0 and total_spent >= TOTAL_BUDGET:
        return

    if bar_count < INTERVAL_BARS and buy_count > 0:
        return

    amount = AMT_EACH

    if DIP_BUY and last_price > 0:
        drop = (last_price - price) / last_price
        if drop >= DIP_THRESHOLD:
            amount = AMT_EACH * 2
            ctx.log("DIP detected (%.2f%%), doubling buy" % (drop * 100))

    if TOTAL_BUDGET > 0:
        remaining = TOTAL_BUDGET - total_spent
        if amount > remaining:
            amount = remaining
        if amount <= 0:
            return

    ctx.buy(price=price, amount=amount)
    ctx._params["total_spent"] = total_spent + amount
    ctx._params["buy_count"] = buy_count + 1
    ctx._params["bar_count"] = 0
    ctx._params["last_buy_price"] = price
    ctx.log("DCA #%d: BUY %.2f USDT @ %.6f (total: %.2f)" % (buy_count + 1, amount, price, total_spent + amount))
`
  }
}

/**
 * 生成完整的策略脚本代码
 * @param {string} botType - 机器人类型
 * @param {object} params - 策略参数
 * @param {object} context - 额外上下文 { timeframe }
 * @returns {string} Python 策略代码
 */
export function generateBotScript (botType, params, context) {
  const generator = BOT_SCRIPT_TEMPLATES[botType]
  if (!generator) {
    throw new Error(`Unknown bot type: ${botType}`)
  }
  return generator(params, context)
}

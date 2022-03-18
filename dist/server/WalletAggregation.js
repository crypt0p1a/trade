"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const moment_1 = __importDefault(require("moment"));
function pushInto(dayInfos, walletAggregated) {
    if (!dayInfos[walletAggregated.devise])
        dayInfos[walletAggregated.devise] = [];
    dayInfos[walletAggregated.devise].push(walletAggregated);
}
class WalletAggregation {
    constructor(exchange, month, year) {
        this.exchange = exchange;
        this.month = month;
        this.year = year;
        this.dayInfos = {};
    }
    load(runner) {
        return __awaiter(this, void 0, void 0, function* () {
            // artifically create the expected number of info to fetch
            const now = moment_1.default();
            const date = moment_1.default()
                .set('year', this.year)
                .set('day', 1)
                .set('month', this.month);
            const startOfMonth = date.clone().startOf('month');
            const endOfMonth = startOfMonth.clone().endOf('month');
            console.log(`start of month ${startOfMonth} ${startOfMonth.unix() * 1000}`);
            const aggregated = yield runner.walletAggregated(startOfMonth.toDate(), endOfMonth.toDate());
            aggregated.forEach((a) => pushInto(this.dayInfos, a));
            console.log(`took ${moment_1.default().diff(now, 'seconds')}`);
        });
    }
    infoJson() {
        const holder = {};
        Object.keys(this.dayInfos).forEach((key) => {
            if (!holder[key])
                holder[key] = [];
            const walletAggregateds = this.dayInfos[key];
            const walletsByDay = [];
            walletAggregateds.forEach((walletAggregated) => {
                const date = moment_1.default(walletAggregated.start.toNumber());
                const days = date.daysInMonth();
                while (walletsByDay.length < days)
                    walletsByDay.push([]);
                walletsByDay[date.date() - 1].push(walletAggregated);
            });
            holder[key] = walletsByDay.map((wallets) => ({
                expectedMax: Math.max(...wallets.map((w) => w.expectedAmountMax.toNumber())),
                expectedMin: Math.max(...wallets.map((w) => w.expectedAmountMin.toNumber())),
                expectedAvg: wallets
                    .map((w) => w.expectedAmountAvg.toNumber())
                    .reduce((l, r) => l + r, 0) / wallets.length,
                currentMax: Math.max(...wallets.map((w) => w.expectedAmountMax.toNumber())),
                currentMin: Math.max(...wallets.map((w) => w.expectedAmountMin.toNumber())),
                currentAvg: wallets
                    .map((w) => w.expectedAmountAvg.toNumber())
                    .reduce((l, r) => l + r, 0) / wallets.length,
                cardinal: wallets.length,
            }));
        });
        return holder;
    }
    json() {
        return {
            exchange: this.exchange,
            month: this.month,
            year: this.year,
            info: this.infoJson(),
        };
    }
}
exports.default = WalletAggregation;
//# sourceMappingURL=WalletAggregation.js.map
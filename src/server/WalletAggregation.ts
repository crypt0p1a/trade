import moment from 'moment';
import WalletAggregated from '../database/models/wallet_aggregation';
import { Runner } from '../runner';

interface DayInfo {
  expectedMax: number;
  currentMax: number;
  expectedMin: number;
  currentMin: number;
  expectedAvg: number;
  currentAvg: number;
  cardinal: number;
}

interface DayInfoDeviseRaw {
  [devise: string]: DayInfo[];
}

interface DayInfoDevise {
  [devise: string]: WalletAggregated[];
}

function pushInto(dayInfos: DayInfoDevise, walletAggregated: WalletAggregated) {
  if (!dayInfos[walletAggregated.devise]) dayInfos[walletAggregated.devise] = [];
  dayInfos[walletAggregated.devise].push(walletAggregated);
}

export default class WalletAggregation {
  private dayInfos: DayInfoDevise = {};

  private cached: boolean = false;

  public constructor(
    private exchange: string,
    private month: number,
    private year: number,
  ) {}

  public async load(runner: Runner) {
    if (!this.needLoad()) return;

    // reset anyway
    this.dayInfos = {};
    this.cached = false;

    // artifically create the expected number of info to fetch
    const now = moment();
    const date = moment()
      .set('year', this.year)
      .set('day', 1)
      .set('month', this.month);
    const startOfMonth = date.clone().startOf('month');
    const endOfMonth = startOfMonth.clone().endOf('month');
    console.log(`start of month ${startOfMonth} ${startOfMonth.unix() * 1000}`);
    const aggregated = await runner.walletAggregated(
      startOfMonth.toDate(),
      endOfMonth.toDate(),
    );

    aggregated.forEach((a) => pushInto(this.dayInfos, a));

    console.log(`took ${moment().diff(now, 'seconds')}`);
    this.cached = true;
  }

  private needLoad() {
    // if not loaded previously
    if (!this.cached) return true;

    // if the month and year are the same, we need to reload
    const now = moment();
    if (now.get('years') === this.year && now.get('month') === this.month) return true;

    // if the expected date is after the current date, we'll reload anyway
    const expected = now
      .clone()
      .set('years', this.year)
      .set('month', this.month);
    if (now.isBefore(expected)) return true;
    return false;
  }

  private infoJson(): DayInfoDeviseRaw {
    const holder: DayInfoDeviseRaw = {};

    Object.keys(this.dayInfos).forEach((key) => {
      if (!holder[key]) holder[key] = [];
      const walletAggregateds = this.dayInfos[key];

      const walletsByDay: WalletAggregated[][] = [];
      walletAggregateds.forEach((walletAggregated) => {
        const date = moment(walletAggregated.start.toNumber());
        const days = date.daysInMonth();

        while (walletsByDay.length < days) walletsByDay.push([]);

        walletsByDay[date.date() - 1].push(walletAggregated);
      });

      holder[key] = walletsByDay.map((wallets) => ({
        expectedMax:
          wallets.length === 0
            ? 0
            : Math.max(...wallets.map((w) => w.expectedAmountMax.toNumber())),
        expectedMin:
          wallets.length === 0
            ? 0
            : Math.max(...wallets.map((w) => w.expectedAmountMin.toNumber())),
        expectedAvg:
          wallets.length === 0
            ? 0
            : wallets
              .map((w) => w.expectedAmountAvg.toNumber())
              .reduce((l, r) => l + r, 0) / wallets.length,
        currentMax:
          wallets.length === 0
            ? 0
            : Math.max(...wallets.map((w) => w.currentAmountMax.toNumber())),
        currentMin:
          wallets.length === 0
            ? 0
            : Math.max(...wallets.map((w) => w.currentAmountMin.toNumber())),
        currentAvg:
          wallets.length === 0
            ? 0
            : wallets
              .map((w) => w.currentAmountAvg.toNumber())
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

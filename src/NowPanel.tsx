import React, { useEffect, useRef } from 'react';
import { dateTime, GrafanaTheme, PanelProps, TimeRange } from '@grafana/data';
import { BackendSrv, getBackendSrv } from '@grafana/runtime';
import { css, cx } from 'emotion';
import { stylesFactory, useTheme } from '@grafana/ui';

import { DayValues, GspTimeRange, ProductionOptions, Setup } from 'types';

interface Props extends PanelProps<ProductionOptions> {}

export const NowPanel: React.FC<Props> = ({ data, options, timeRange, width, height, onChangeTimeRange }: Props) => {
  const lastTimeRange = useRef<string>();
  const refreshInterval = useRef<NodeJS.Timeout>();
  const theme = useTheme();
  const styles = getStyles(theme);
  const GspLoopback: BackendSrv = getBackendSrv();
  let validSetup = useRef(false);

  const getMinutesFromGspPeriod = (period: string): number => {
    const tmp = period.split(':');
    return Number(tmp[0]) * 60 + Number(tmp[1]);
  };

  const parseSetupPeriods = (day: Date, setup: DayValues): TimeRange => {
    let parsedPeriodFrom = [0, 0]; // [ heures, minutes ]
    let parsedPeriodTo = [0, 0]; // [ heures, minutes ]

    // pas de période de production définie, abandon
    if (setup.periods.length <= 0) {
      return timeRange;
    }

    switch (setup.periods.length) {
      case 1:
        // on ne traite qu'avec un seul index
        parsedPeriodFrom = setup.periods[0].start.split(':').map((t: string) => Number(t));
        parsedPeriodTo = setup.periods[0].end.split(':').map((t: string) => Number(t));
        break;

      default:
        // on réalise une copie du tableau
        const tmp: GspTimeRange[] = [];
        for (let p of setup.periods) {
          tmp.push({ ...p });
        }
        // on trie du start le plus petit a start le plus grand et on ne conserve que le premier élément
        tmp.sort((a, b) => getMinutesFromGspPeriod(a.start) - getMinutesFromGspPeriod(b.start));
        parsedPeriodFrom = tmp[0].start.split(':').map((t: string) => Number(t));

        // on trie du end le plus grand a end le plus petit et on ne conserve que le premier élément
        tmp.sort((a, b) => getMinutesFromGspPeriod(b.end) - getMinutesFromGspPeriod(a.end));
        parsedPeriodTo = tmp[0].end.split(':').map((t: string) => Number(t));
        break;
    }
    const from = new Date(day);
    const to = new Date(day);
    const now = new Date();
    const dayIsToday = from.toDateString() === now.toDateString();
    from.setHours(parsedPeriodFrom[0], parsedPeriodFrom[1], 0, 0);
    to.setHours(parsedPeriodTo[0], parsedPeriodTo[1], 0, 0);
    if (dayIsToday && now.getTime() < from.getTime()) {
      to.setHours(from.getHours(), from.getMinutes(), from.getSeconds(), 0);
    } else if (dayIsToday && now.getTime() < to.getTime()) {
      to.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
    }
    return { from: dateTime(from), to: dateTime(to), raw: { from: from.toLocaleString(), to: to.toLocaleString() } };
  };

  const setTimePeriod = (day: Date, setup: DayValues) => {
    const { from, to } = parseSetupPeriods(day, setup);
    const newTimeRange = { from: from.valueOf(), to: to.valueOf() };
    if (JSON.stringify(newTimeRange) !== lastTimeRange.current) {
      onChangeTimeRange(newTimeRange);
      lastTimeRange.current = JSON.stringify(newTimeRange);
    }
  };
  const getConfig = (): Promise<Setup> => {
    return new Promise(async (resolve, reject) => {
      const url = [window.location.protocol, '//', window.location.hostname, ':', '3000'].join('');
      try {
        const data = await GspLoopback.get(`${url}/app-setup/opening-time-setup`);
        const setupError =
          !data || !data.value || !data.value.week || !Array.isArray(data.value.week) || data.value.week.length <= 0;
        validSetup.current = !setupError;
        return resolve(data);
      } catch (e) {
        return reject(e);
      }
    });
  };
  const updateTodayTimePeriod = async () => {
    const ot = await getConfig();
    if (!ot || !ot.value || !ot.value.week || ot.value.week.length <= 0) {
      return;
    }
    let e = new Date();
    const weekDayIndex = ot.value.week.findIndex((day) => day.weekDay === e.getDay());
    if (weekDayIndex < 0) {
      return;
    }
    setTimePeriod(e, ot.value.week[weekDayIndex]);
  };

  useEffect(() => {
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
    }
    refreshInterval.current = setInterval(() => {
      updateTodayTimePeriod();
    }, options.refreshSeconds * 1000);
    updateTodayTimePeriod();
  }, [timeRange, options.refreshSeconds]);

  const getClock = () => {
    const now = new Date();
    return (
      <div className={cx(styles.content)}>
        <span className={cx(styles.childField, styles.dateField)}>{now.toLocaleDateString()}</span>
        <span className={cx(styles.childField, styles.timeField)}>
          {[
            now.getHours().toString().length < 2 ? `0${now.getHours().toString()}` : now.getHours().toString(),
            now.getMinutes().toString().length < 2 ? `0${now.getMinutes().toString()}` : now.getMinutes().toString(),
          ].join(':')}
        </span>
      </div>
    );
  };

  return (
    <div
      className={cx(
        styles.wrapper,
        css`
          width: ${width}px;
          height: ${height}px;
        `
      )}
    >
      {validSetup && getClock()}
    </div>
  );
};

const getStyles = stylesFactory((theme: GrafanaTheme) => {
  return {
    wrapper: css`
      position: relative;
    `,
    content: css`
      display: flex;
      flex-flow: row nowrap;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
    `,
    childField: css`
      flex: 1 1 auto;
    `,
    dateField: css`
      color: light-grey;
      font-size: 4em;
      text-align: left;
    `,
    timeField: css`
      color: light-grey;
      font-size: 6em;
      text-align: right;
    `,
  };
});

// For Grafana versions older than 7.3.0.
export const legacyClassicColors = [
  '#7EB26D', // 0: pale green
  '#EAB839', // 1: mustard
  '#6ED0E0', // 2: light blue
  '#EF843C', // 3: orange
  '#E24D42', // 4: red
  '#1F78C1', // 5: ocean
  '#BA43A9', // 6: purple
  '#705DA0', // 7: violet
  '#508642', // 8: dark green
  '#CCA300', // 9: dark sand
  '#447EBC',
  '#C15C17',
  '#890F02',
  '#0A437C',
  '#6D1F62',
  '#584477',
  '#B7DBAB',
  '#F4D598',
  '#70DBED',
  '#F9BA8F',
  '#F29191',
  '#82B5D8',
  '#E5A8E2',
  '#AEA2E0',
  '#629E51',
  '#E5AC0E',
  '#64B0C8',
  '#E0752D',
  '#BF1B00',
  '#0A50A1',
  '#962D82',
  '#614D93',
  '#9AC48A',
  '#F2C96D',
  '#65C5DB',
  '#F9934E',
  '#EA6460',
  '#5195CE',
  '#D683CE',
  '#806EB7',
  '#3F6833',
  '#967302',
  '#2F575E',
  '#99440A',
  '#58140C',
  '#052B51',
  '#511749',
  '#3F2B5B',
  '#E0F9D7',
  '#FCEACA',
  '#CFFAFF',
  '#F9E2D2',
  '#FCE2DE',
  '#BADFF4',
  '#F9D9F9',
  '#DEDAF7',
];

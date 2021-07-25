import React, { useEffect, useRef } from 'react';
import { dateTime, GrafanaTheme, PanelProps, TimeRange } from '@grafana/data';
import { css, cx } from 'emotion';
import { stylesFactory, useTheme } from '@grafana/ui';

import { GspTimeRange, ProductionOptions } from 'types';

interface Props extends PanelProps<ProductionOptions> {}

export const NowPanel: React.FC<Props> = ({ data, options, timeRange, width, height, onChangeTimeRange }: Props) => {
  const lastTimeRange = useRef<string>();
  const refreshInterval = useRef<NodeJS.Timeout>();
  const shiftSchedule = useRef<GspTimeRange[]>();
  const theme = useTheme();
  const styles = getStyles(theme);
  let validSetup = useRef(false);

  const getMinutesFromGspPeriod = (period: string): number => {
    const tmp = period.split(':');
    return Number(tmp[0]) * 60 + Number(tmp[1]);
  };

  const parseSetupPeriods = (): TimeRange => {
    let parsedPeriodFrom = [0, 0]; // [ heures, minutes ]
    let parsedPeriodTo = [0, 0]; // [ heures, minutes ]

    // pas de période de production définie, abandon
    if (!shiftSchedule.current || shiftSchedule.current.length < 0) {
      return timeRange;
    }

    switch (shiftSchedule.current.length) {
      case 0:
        return timeRange;

      case 1:
        // on ne traite qu'avec un seul index
        parsedPeriodFrom = shiftSchedule.current[0].start.split(':').map((t: string) => Number(t));
        parsedPeriodTo = shiftSchedule.current[0].end.split(':').map((t: string) => Number(t));
        break;

      default:
        // on réalise une copie du tableau
        const tmp: GspTimeRange[] = [];
        for (let p of shiftSchedule.current) {
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
    const today = new Date();
    const from = new Date(today);
    const to = new Date(today);
    from.setHours(parsedPeriodFrom[0], parsedPeriodFrom[1], 0, 0);
    to.setHours(parsedPeriodTo[0], parsedPeriodTo[1], 0, 0);
    return { from: dateTime(from), to: dateTime(to), raw: { from: from.toLocaleString(), to: to.toLocaleString() } };
  };

  const setTimePeriod = () => {
    const { from, to } = parseSetupPeriods();
    const newTimeRange = { from: from.valueOf(), to: to.valueOf() };
    if (JSON.stringify(newTimeRange) !== lastTimeRange.current) {
      onChangeTimeRange(newTimeRange);
      lastTimeRange.current = JSON.stringify(newTimeRange);
    }
  };

  useEffect(() => {
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
    }
    refreshInterval.current = setInterval(() => {
      setTimePeriod();
    }, options.refreshSeconds * 1000);
    setTimePeriod();
  }, [timeRange, options.refreshSeconds]);

  const getShiftSchedule = () => {
    if (data.state !== 'Done' || data.series.length <= 0) {
      return;
    }
    const shiftSched = data.series.find((serie) => serie.refId === 'shiftSchedule');
    if (!shiftSched) {
      return;
    }
    if (!shiftSched.fields || shiftSched.fields.length < 0) {
      return;
    }
    let tmpStart = shiftSched.fields.filter((field) => field.name === 'start');
    if (tmpStart.length !== 1) {
      return;
    }
    let tmpEnd = shiftSched.fields.filter((field) => field.name === 'end');
    if (tmpEnd.length !== 1) {
      return;
    }
    const tmpSched = {
      start: tmpStart[0].values.toArray(),
      end: tmpEnd[0].values.toArray(),
    };
    shiftSchedule.current = tmpSched.start.map((startval, i) => ({
      start: tmpSched.start[i],
      end: tmpSched.end[i],
    }));
    validSetup.current = true;
  };

  useEffect(() => {
    getShiftSchedule();
  }, [data]);

  const getClock = () => {
    const now = new Date();
    return (
      <div className={cx(styles.content)}>
        <span className={cx(styles.childField, styles.dateField)}>{now.toLocaleDateString()}</span>
        {options.dashboardTitle && options.dashboardTitle.length > 0 && (
          <span className={cx(styles.childField, styles.titleField)}>{options.dashboardTitle}</span>
        )}
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
    titleField: css`
      color: light-grey;
      font-size: 4em;
      text-align: center;
      padding: 0;
      margin: 0;
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

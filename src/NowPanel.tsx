import React, { useEffect, useRef } from 'react';
import { dateTime, GrafanaTheme, PanelProps } from '@grafana/data';
import { css, cx } from 'emotion';
import { stylesFactory, useTheme } from '@grafana/ui';
import { GspTimeRange, Series } from '../../iosystems-plugin-support';

import { ProductionOptions } from 'types';

interface Props extends PanelProps<ProductionOptions> {}

export const NowPanel: React.FC<Props> = ({ data, options, timeRange, width, height, onChangeTimeRange }: Props) => {
  const lastTimeRange = useRef<string>();
  const refreshInterval = useRef<NodeJS.Timeout>();
  const shiftSchedule = useRef<GspTimeRange[]>();
  const theme = useTheme();
  const styles = getStyles(theme);
  const validSetup = useRef(false);
  const _init = useRef(false);
  const _series = new Series();

  const setTimePeriod = () => {
    if (!shiftSchedule.current || shiftSchedule.current.length <= 0) {
      return;
    }
    let { from, to } = _series.parseSetupPeriods(new Date(), shiftSchedule.current, timeRange);
    if (new Date().getTime() < to.toDate().getTime()) {
      to = dateTime(new Date());
    }
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
    refreshInterval.current = setTimeout(() => {
      setTimePeriod();
    }, options.refreshSeconds * 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.refreshSeconds]);

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
    // setTimePeriod();
    if (!_init.current) {
      setTimePeriod();
    }
    _init.current = true;
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
    }
    refreshInterval.current = setTimeout(() => {
      setTimePeriod();
    }, options.refreshSeconds * 1000);
    validSetup.current = true;
  };

  useEffect(() => {
    getShiftSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

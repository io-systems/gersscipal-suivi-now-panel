import { PanelPlugin } from '@grafana/data';
import { ProductionOptions } from './types';
import { NowPanel } from './NowPanel';

export const plugin = new PanelPlugin<ProductionOptions>(NowPanel).setPanelOptions((builder) => {
  return builder
    .addTextInput({
      path: 'dashboardTitle',
      name: 'Titre',
      description: 'Titre panel',
      category: ['Général'],
      defaultValue: '',
    })
    .addNumberInput({
      path: 'refreshSeconds',
      name: 'Seconds',
      description: 'Nombre de secondes entre deux rafraîchissements.',
      category: ['Rafraîchissement automatique des données'],
      defaultValue: 60,
    });
});

import { Platform } from 'react-native';
import { requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget';
import { load } from '../lib/store';
import { TodayWidget } from './TodayWidget';
import type { AppData } from '../lib/types';

export const WIDGET_NAME = 'Today';

const render = (data: AppData | null) => ({ light: <TodayWidget data={data} />, dark: <TodayWidget data={data} dark /> });

/** Runs in the background when Android asks the widget to draw itself. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetInfo.widgetName !== WIDGET_NAME) return;
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(render(await load().catch(() => null)));
      break;
    default:
      break;
  }
}

/** Called from the app when data changes, so the widget stays current. */
export function refreshWidget(data: AppData) {
  if (Platform.OS !== 'android') return;
  requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: () => render(data) }).catch(() => {});
}

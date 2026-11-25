import { Platform } from 'react-native';
import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import App from './App';
import { widgetTaskHandler } from './src/widget/handler';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);

// Home-screen widget (Android): draws itself in the background from the saved data.
if (Platform.OS === 'android') registerWidgetTaskHandler(widgetTaskHandler);

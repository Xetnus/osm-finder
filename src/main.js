import { createApp } from 'vue'
import App from './App.vue'
import VueKonva from 'vue-konva';
import { Quasar } from 'quasar';

// Import icon libraries
import '@quasar/extras/material-icons/material-icons.css'
// Import Quasar css
import 'quasar/dist/quasar.css'

import './assets/main.css'

const app = createApp(App);
app.use(VueKonva);
app.use(Quasar, {
    config: {
        brand: {
            primary: '#124559',
        //     secondary: '#ececec',
        //     accent: '#9C27B0',
        //     'dark-page': '#121212',
            dark: '#333',
        //     positive: '#21BA45',
        //     negative: '#C10015',
        //     info: '#31CCEC',
        //     warning: '#F2C037'
        }
    }
});
app.mount('#app');

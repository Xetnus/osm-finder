import { createApp } from 'vue'
import App from './App.vue'
import VueKonva from 'vue-konva';
import { Quasar } from 'quasar';
import VoerroTagsInput from '@james090500/vue-tagsinput';

// Import icon libraries
import '@quasar/extras/material-icons/material-icons.css'
// Import Quasar css
import 'quasar/dist/quasar.css'

import '@james090500/vue-tagsinput/dist/style.css'
import './assets/vue-tagsinput.css'

import './assets/main.css'

const app = createApp(App);
app.use(VueKonva);
app.use(Quasar, {
    config: {
        brand: {
            primary: '#124559',
        //     secondary: '#ececec',
        //     accent: '#9C27B0',

        //     dark: '#1d1d1d',
        //     'dark-page': '#121212',
            dark: '#333',

        //     positive: '#21BA45',
        //     negative: '#C10015',
        //     info: '#31CCEC',
        //     warning: '#F2C037'
        }
    }
});
app.component('tags-input', VoerroTagsInput)
app.mount('#app');

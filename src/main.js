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
app.use(Quasar);
app.component('tags-input', VoerroTagsInput)
app.mount('#app');

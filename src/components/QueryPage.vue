<script>
import {constructQuery} from '../assets/queryCreator.js'

  export default {
    props: ['annotations', 'programStage'],
    emits: ['programStageChange'],
    data() {
      return {
        queryVisible: true,
        displayUrls: true,
      }
    },
    mounted() {
      window.addEventListener('keydown', this.keyDownListener);
    },
    methods: {
      keyDownListener(event) {
        if (event.key === 'ArrowLeft' || event.key === 'Escape') {
          this.back();
        }
      },
      back() {
        window.removeEventListener('keydown', this.keyDownListener);
        this.$emit('programStageChange', this.programStage - 1);
      },
      copy() {
        let content = document.getElementById('content').innerText;
        navigator.clipboard.writeText(content).then(function() {
          // Success!
        }, function(err) {
          alert('Copying not supported on this browser.')
        });
      },
      getQuery(urls) {
        let deepCopy = JSON.parse(JSON.stringify(this.annotations));
        return constructQuery(deepCopy, urls);
      }
    }
  }
</script>

<template>
  <q-dialog v-model="queryVisible" full-width persistent transition-show="rotate" transition-hide="rotate">
    <q-card>
      <q-card-actions align="right">
        <h5>Run this query in your PostgreSQL terminal.</h5>
        <q-space/>
        <q-toggle
          class="q-mr-lg toggle"
          v-model="displayUrls"
          checked-icon="check"
          color="green"
          unchecked-icon="clear"
          left-label
          label="With URLs"
        />
        <q-btn flat icon="content_copy" @click="copy()" padding="15px 10px" color="primary">
          <q-tooltip>Copy Query</q-tooltip>
        </q-btn>
        <q-btn flat icon="close" @click="back()" padding="15px 10px" color="primary">
          <q-tooltip>Close</q-tooltip>
        </q-btn>
      </q-card-actions>

      <q-separator/>

      <q-card-section class="q-pt-none">
        <div>
          <pre id="content">{{ getQuery(displayUrls) }}</pre>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<style scoped>
  div {
    color: black;
  }

  h5 {
    user-select: none;
  }

  .toggle {
    user-select: none;
  }
</style>

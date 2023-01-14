<script>
import {constructQuery} from '../assets/queryCreator.js'

  export default {
    props: ['annotations', 'programStage'],
    emits: ['programStageChange'],
    data() {
      return {
        queryVisible: true,
      }
    },
    methods: {
      back() {
        this.$emit('programStageChange', this.programStage - 1);
      },
      copy() {
        let content = document.getElementById('content').innerHTML;
        navigator.clipboard.writeText(content).then(function() {
          // Success!
        }, function(err) {
          alert('Copying not supported on this browser.')
        });
      },
      getQuery() {
        return constructQuery(this.annotations);
      }
    }
  }
</script>

<template>
  <q-dialog v-model="queryVisible" full-width persistent transition-show="rotate" transition-hide="rotate">
    <q-card>
      <q-card-actions align="right">
        <q-btn flat icon="content_copy" @click="copy()" padding="15px 10px" color="primary">
          <q-tooltip>Copy Query</q-tooltip>
        </q-btn>
        <q-btn flat icon="close" @click="back()" padding="15px 10px" color="primary">
          <q-tooltip>Close</q-tooltip>
        </q-btn>

      </q-card-actions>

      <q-card-section class="q-pt-none">
        <div>
          <pre id="content">{{ getQuery() }}</pre>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<style scoped>

</style>

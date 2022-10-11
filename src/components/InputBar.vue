<script setup>
  import UploadBar from './UploadBar.vue'
  import DrawBar from './DrawBar.vue'
</script>

<script>
  export default {
    props: ['programStage', 'linestrings', 'nodes', 'drawingState'],
    emits: ['upload', 'programStageChange', 'drawingStateChange'],
    methods: {
      next() {
        this.$emit('programStageChange', this.programStage + 1);
      },
      back() {
        this.$emit('programStageChange', this.programStage - 1);
      },
      upload() {
        this.$emit('upload');
      },
      drawingStateChange(state) {
        this.$emit('drawingStateChange', state)
      }
    },
  }
</script>

<template>
  <div>
    <UploadBar v-if="this.programStage == 1" @next="next" @upload="upload"/>
    <DrawBar v-if="this.programStage == 2" @next="next" @back="back" @drawingStateChange="drawingStateChange" :drawingState="drawingState"/>
  </div>
</template>

<style scoped>
  div {
    padding-top: 2em;
  }
</style>
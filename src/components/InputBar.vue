<script setup>
  import UploadBar from './UploadBar.vue'
  import DrawBar from './DrawBar.vue'
  import PropertiesBar from './PropertiesBar.vue'
  import RelationBar from './RelationBar.vue'
</script>

<script>
  export default {
    props: ['programStage', 'annotations', 'drawingState'],
    emits: ['upload', 'programStageChange', 'drawingStateChange', 'annotationsChange'],
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
        this.$emit('drawingStateChange', state);
      },
      annotationsChange(annotations) {
        this.$emit('annotationsChange', annotations);
      }
    },
  }
</script>

<template>
  <section>
    <UploadBar v-if="this.programStage == 1" 
      @next="next" @upload="upload"/>

    <DrawBar v-if="this.programStage == 2" 
      @next="next" @back="back" @drawingStateChange="drawingStateChange" @annotationsChange="annotationsChange"
      :drawingState="drawingState" :annotations="annotations"/>

    <PropertiesBar v-if="this.programStage == 3" 
      @next="next" @back="back" @annotationsChange="annotationsChange"
      :annotations="annotations"/>

    <RelationBar v-if="this.programStage == 4" 
      @next="next" @back="back" @annotationsChange="annotationsChange"
      :annotations="annotations"/>
  </section>
</template>

<style scoped>
  section {
    padding-top: 2em;
  }
</style>
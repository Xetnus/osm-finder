<script setup>
  import UploadBar from './UploadBar.vue'
  import DrawBar from './DrawBar.vue'
  import PropertiesBar from './PropertiesBar.vue'
  import RelationBar from './RelationBar.vue'
</script>

<script>
  export default {
    props: ['programStage', 'annotations', 'hiddenAnnotations', 'drawingState'],
    emits: ['upload', 'programStageChange', 'drawingStateChange', 'annotationsChange', 'hiddenAnnotationsChange'],
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
      hiddenAnnotationsChange(hiddenAnnotations) {
        this.$emit('hiddenAnnotationsChange', hiddenAnnotations);
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
      @next="next" @back="back" @drawingStateChange="drawingStateChange" @hiddenAnnotationsChange="hiddenAnnotationsChange"
      :drawingState="drawingState" :annotations="annotations" :hiddenAnnotations="hiddenAnnotations"/>

    <PropertiesBar v-if="this.programStage == 3" 
      @next="next" @back="back" @hiddenAnnotationsChange="hiddenAnnotationsChange" @annotationsChange="annotationsChange"
      :annotations="annotations" :hiddenAnnotations="hiddenAnnotations"/>

    <RelationBar v-if="this.programStage == 4" 
      @next="next" @back="back" @hiddenAnnotationsChange="hiddenAnnotationsChange" @annotationsChange="annotationsChange"
      :annotations="annotations" :hiddenAnnotations="hiddenAnnotations"/>
  </section>
</template>

<style scoped>
  section {
    padding-top: 2em;
  }
</style>
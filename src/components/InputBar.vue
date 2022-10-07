<script setup>
  import UploadBar from './UploadBar.vue'
  import DrawBar from './DrawBar.vue'
</script>

<script>
  export default {
    props: ['stage'],
    emits: ['upload', 'stageChange'],
    methods: {
      next() {
        this.$emit('stageChange', this.stage + 1)
      },
      back() {
        this.$emit('stageChange', this.stage - 1)
      },
      upload() {
        this.$emit('upload')
      }
    },
  }
</script>

<template>
  <div>
    <UploadBar v-if="this.stage == 1" @next="next" @upload="upload"/>
    <DrawBar v-if="this.stage == 2" @next="next" @back="back"/>
  </div>
</template>

<style scoped>
  div {
    display: flex;
    gap: 20px;
    flex-direction: row;
    justify-content: center;
    padding-top: 2em;
  }
</style>
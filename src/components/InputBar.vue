<script setup>
  import UploadBar from './UploadBar.vue'
  import DrawBar from './DrawBar.vue'
</script>

<script>
  export default {
    methods: {
      next() {
        this.stage++
        console.log(this.stage)
      },
      back() {
        this.stage--
        console.log(this.stage)
      }
    },
    data() {
      return { stage: 1 }
    }
  }
</script>

<template>
  <div>
    <UploadBar v-if="this.stage == 1" @next="next"/>
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
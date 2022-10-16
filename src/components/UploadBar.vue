<script>
  export default {
    emits: ['next', 'upload'],
    methods: {
      handleNext(event) {
        this.$emit('next')
      },
      handleUpload(event) {
        this.$emit('upload')
      }
    }
  }
</script>

<template>
  <div>
    <button @click="handleUpload" id="upload">Upload Photo</button>
    <button @click="handleNext" id="next">Next</button>
  </div>
</template>

<style scoped>
  div {
    display: flex;
    gap: 20px;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    align-items: flex-start;
  }
</style>

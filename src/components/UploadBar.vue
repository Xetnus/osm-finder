<script>
  export default {
    methods: {
      handleNext(event) {
        this.$emit('next')
      }
    }
  }
</script>

<template>
  <button id="upload">Upload Photo</button>
  <button @click="handleNext" id="next">Next</button>
</template>

<style scoped>
  button {
    font-size: 16px;
    height: 46px;
    padding: 0 15px;
    text-align: center;
    border: 1px solid darkgreen;
    background-color: lightgreen;
  }

  button:hover {
    filter: brightness(80%)
  }

  button:active {
    filter: brightness(40%)
  }
</style>

<script>
  export default {
    emits: ['next', 'back'],
    methods: {
      handleNext(event) {
        this.$emit('next')
      },
      handleBack(event) {
          this.$emit('back')
      }
    }
  }
</script>

<template>
  <button id="back" @click="handleBack">Back</button>
  <button id="next" @click="handleNext">Next</button>
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
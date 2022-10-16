<script>
  export default {
    props: ['annotations', 'hiddenAnnotations'],
    emits: ['next', 'back', 'hiddenAnnotationsChange'],
    data() {
      return {
        maxDistance: '',
        minDistance: '',
        angle: '',
        error: '',
      }
    },
    methods: {
      handleNext(event) {
        // this.$emit('next')
      },
      handleBack(event) {
        this.$emit('back')
      },
    }
  }
</script>

<template>
  <p>Relationship between {} and {}</p>
  <div>
    <button @click="handleBack" id="back">Back</button>
    <input v-model="maxDistance" placeholder="Max distance (m)"/>
    <input v-model="minDistance" placeholder="Min distance (m)"/>
    <input v-model="angle" placeholder="Angle"/>
    <input v-model="error" placeholder="Error"/>
    <button @click="handleNext" id="next">Next</button>
  </div>
</template>

<style scoped>
  p {
    font-weight: bold;
    font-size: 20px;
    text-align: center;
    margin-bottom: 0.4em;
  }

  input {
    width: 10em;
  }

  div {
    display: flex;
    gap: 20px;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }
</style>

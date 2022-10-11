<script>
  export default {
    props: ['drawingState'],
    emits: ['next', 'back', 'drawingStateChange'],
    methods: {
      handleNext(event) {
        this.$emit('next')
      },
      handleBack(event) {
        this.$emit('back')
      },
      handleClick(event) {
        let state = this.drawingState;
        const toChange = event.srcElement.id;
        state[[toChange]] = true;
        this.$emit('drawingStateChange', state)
      },
    }
  }
</script>

<template>
  <div>
    <button id="drawingLinestring" @click="handleClick">Linestring</button>
    <button id="cancel" :disabled="!this.drawingState.drawingLinestring && !this.drawingState.drawingNode" 
      @click="handleClick">Cancel</button>
  </div>
  <div>
    <button id="back" @click="handleBack">Back</button>
    <button id="undo" @click="handleClick">Undo</button>
    <button id="redo" @click="handleClick">Redo</button>
    <button id="next" @click="handleNext">Next</button>
  </div>
</template>

<style scoped>
  div {
    display: flex;
    gap: 20px;
    flex-direction: row;
    flex-wrap: wrap;
    flex-shrink: 3;
    justify-content: center;
    padding-bottom: 0.5em;
  }

  button {
    font-size: 16px;
    height: 46px;
    padding: 0 15px;
    text-align: center;
    border: 1px solid darkgreen;
    background-color: lightgreen;
  }

  button:hover:enabled {
    filter: brightness(80%)
  }

  button:active:enabled {
    filter: brightness(40%)
  }
</style>
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
        state[[toChange]] = !state[[toChange]];
        this.$emit('drawingStateChange', state)
      },
    }
  }
</script>

<template>
  <div>
    <button id="drawingLinestring" :class="{active: this.drawingState.drawingLinestring}" @click="handleClick">Linestring</button>
    <button id="drawingNode" title="Not implemented" :class="{active: this.drawingState.drawingNode}" @click="handleClick" disabled>Node</button>
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

  button.active {
    background-color: green;
    box-shadow: 0 0 5px 1px black;
  }

  button:hover:enabled {
    filter: brightness(80%)
  }

  button:active:enabled {
    filter: brightness(40%)
  }
</style>
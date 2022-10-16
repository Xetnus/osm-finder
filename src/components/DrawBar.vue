<script>
  export default {
    props: ['drawingState', 'annotations', 'undoHistory'],
    emits: ['next', 'back', 'drawingStateChange', 'undoHistoryChange'],
    methods: {
      handleNext(event) {
        this.$emit('next')
      },
      handleBack(event) {
        this.$emit('back')
      },
      handleToggle(event) {
        let state = this.drawingState;
        const toChange = event.srcElement.id;
        state[[toChange]] = !state[[toChange]];
        this.$emit('drawingStateChange', state);
      },
      handleUndo(event) {
        // Add the index of the most recently created annotation to
        // undoHistory, as long as it wasn't already added
        for (var i = this.annotations.length - 1; i >= 0; i--) {
          if (!this.undoHistory.includes(i)) {
            let history = this.undoHistory;
            this.$emit('undoHistoryChange', history.push(i));
            return;
          }
        }
      },
      handleRedo(event) {
        let history = this.undoHistory;
        this.$emit('undoHistoryChange', history.pop());
      },
    }
  }
</script>

<template>
  <div>
    <button id="drawingLinestring" :class="{active: this.drawingState.drawingLinestring}" @click="handleToggle">Linestring</button>
    <button id="drawingNode" title="Not implemented" :class="{active: this.drawingState.drawingNode}" @click="handleToggle" disabled>Node</button>
  </div>
  <div>
    <button id="back" @click="handleBack">Back</button>
    <button id="undo" :disabled="!(annotations.length - undoHistory.length)" @click="handleUndo">Undo</button>
    <button id="redo" :disabled="!undoHistory.length" @click="handleRedo">Redo</button>
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
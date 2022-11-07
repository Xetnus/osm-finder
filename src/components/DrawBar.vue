<script>
  export default {
    props: ['drawingState', 'annotations'],
    emits: ['next', 'back', 'drawingStateChange', 'annotationsChange'],
    data() {
      return {
        infoLabel: '',
        history: [],
      }
    },
    methods: {
      handleNext(event) {
        if (this.annotations.length > 1) {
          this.$emit('next')
        } else {
          this.infoLabel = 'Draw at least two lines or nodes.';
        }
      },
      handleBack(event) {
        this.$emit('back')
      },
      toggleLinestring(event) {
        let state = this.drawingState;
        state['drawingLinestring'] = !state['drawingLinestring'];
        state['drawingNode'] = false;
        this.$emit('drawingStateChange', state);

        this.infoLabel = state['drawingLinestring'] ? 'Click and drag to draw a line.': '';
      },
      toggleNode(event) {
        let state = this.drawingState;
        state['drawingNode'] = !state['drawingNode'];
        state['drawingLinestring'] = false;
        this.$emit('drawingStateChange', state);

        this.infoLabel = state['drawingNode'] ? 'Click once anywhere on the canvas to place a node.': '';
      },
      handleUndo(event) {
        let anns = this.annotations;
        this.history.push(anns.pop());
        this.$emit('annotationsChange', anns);
      },
      handleRedo(event) {
        let anns = this.annotations;
        anns.push(this.history.pop());
        this.$emit('annotationsChange', anns);
      },
    }
  }
</script>

<template>
  <div>
    <button :class="{active: this.drawingState.drawingLinestring}" @click="toggleLinestring">Linestring</button>
    <button :class="{active: this.drawingState.drawingNode}" @click="toggleNode">Node</button>
  </div>
  <div>
    <button id="back" @click="handleBack">Back</button>
    <button id="undo" :disabled="!annotations.length" @click="handleUndo">Undo</button>
    <button id="redo" :disabled="!history.length" @click="handleRedo">Redo</button>
    <button id="next" @click="handleNext">Next</button>
  </div>
  <p>{{infoLabel}}</p>
</template>

<style scoped>
  p {
    font-size: 16px;
    padding-top: 5px;
    text-align: center;
  }

  div:first-child {
    padding-bottom: 10px;
  }

  div {
    display: flex;
    gap: 10px;
    flex-direction: row;
    flex-wrap: wrap;
    flex-basis: auto;
    justify-content: center;
  }

  button.active {
    background-color: green;
    box-shadow: 0 0 5px 1px black;
  }
</style>
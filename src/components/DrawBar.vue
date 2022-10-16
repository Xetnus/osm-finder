<script>
  export default {
    props: ['drawingState', 'annotations', 'hiddenAnnotations'],
    emits: ['next', 'back', 'drawingStateChange', 'hiddenAnnotationsChange'],
    data() {
      return {
        infoLabel: '',
      }
    },
    methods: {
      handleNext(event) {
        // if (this.annotations.length - this.hiddenAnnotations.length > 1) {
          this.$emit('next')
        // } else {
          // this.infoLabel = 'Draw at least two lines.';
        // }
      },
      handleBack(event) {
        this.$emit('back')
      },
      toggleLinestring(event) {
        let state = this.drawingState;
        state['drawingLinestring'] = !state['drawingLinestring'];
        this.$emit('drawingStateChange', state);

        this.infoLabel = state['drawingLinestring'] ? 'Click and drag to draw a line.': '';
      },
      handleUndo(event) {
        // Add the index of the most recently created annotation to
        // hiddenAnnotations, as long as it wasn't already added
        for (var i = this.annotations.length - 1; i >= 0; i--) {
          if (!this.hiddenAnnotations.includes(i)) {
            let history = this.hiddenAnnotations;
            history.push(i);
            this.$emit('hiddenAnnotationsChange', history);
            return;
          }
        }
      },
      handleRedo(event) {
        let history = this.hiddenAnnotations;
        history.pop();
        this.$emit('hiddenAnnotationsChange', history);
      },
    }
  }
</script>

<template>
  <div>
    <button :class="{active: this.drawingState.drawingLinestring}" @click="toggleLinestring">Linestring</button>
    <button title="Not implemented" :class="{active: this.drawingState.drawingNode}" disabled>Node</button>
  </div>
  <div>
    <button id="back" @click="handleBack">Back</button>
    <button id="undo" :disabled="!(annotations.length - hiddenAnnotations.length)" @click="handleUndo">Undo</button>
    <button id="redo" :disabled="!hiddenAnnotations.length" @click="handleRedo">Redo</button>
    <button id="next" @click="handleNext">Next</button>
  </div>
  <p>{{infoLabel}}</p>
</template>

<style scoped>
  p {
    text-align: center;
  }

  div {
    display: flex;
    gap: 20px;
    flex-direction: row;
    flex-wrap: wrap;
    flex-shrink: 3;
    justify-content: center;
    padding-bottom: 0.5em;
  }

  button.active {
    background-color: green;
    box-shadow: 0 0 5px 1px black;
  }
</style>
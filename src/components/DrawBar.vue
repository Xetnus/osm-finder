<script>
  export default {
    props: ['drawingState', 'annotations'],
    emits: ['next', 'back', 'drawingStateChange', 'annotationsChange'],
    data() {
      return {
        history: [],
      }
    },
    methods: {
      handleNext(event) {
        if (this.annotations.length > 1) {
          this.$emit('next')
        } else {
          // Displays warning if fewer than 2 items have been drawn
          this.$refs.warning.show();
          setTimeout(() => {
            if (this.$refs.warning)
              this.$refs.warning.hide();
          }, 5000);
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
      },
      toggleNode(event) {
        let state = this.drawingState;
        state['drawingNode'] = !state['drawingNode'];
        state['drawingLinestring'] = false;
        this.$emit('drawingStateChange', state);
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
    <q-btn :class="{active: this.drawingState.drawingLinestring}" icon="north_east" @click="toggleLinestring" label="Linestring" color="primary">
      <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
        Click and drag to draw a line.
      </q-tooltip>
    </q-btn>
    <q-btn :class="{active: this.drawingState.drawingNode}" icon="radio_button_checked" @click="toggleNode" label="Node" color="primary">
      <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
        Click once on the canvas to place a node.
      </q-tooltip>
    </q-btn>
  </div>

  <div>
    <q-btn @click="handleBack" id="back" label="Back" color="primary"/>
    <q-btn @click="handleUndo" :disabled="!annotations.length" icon="undo" id="undo" label="Undo" color="secondary"/>
    <q-btn @click="handleRedo" :disabled="!history.length" icon="redo" id="redo" label="Redo" color="secondary"/>
    <q-btn @click="handleNext" id="next" label="Next" color="primary"/>
  </div>

  <q-dialog ref="warning" v-model="seamless" seamless position="top">
    <q-card class="bg-warning text-black">
      <q-card-section id="card-section" class="row items-center no-wrap">
        <div id="warning-msg">Draw at least two linestrings, nodes, or a combination of both.</div>
        <q-btn flat round icon="close" v-close-popup />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<style scoped>
  p {
    font-size: 16px;
    padding-top: 5px;
    text-align: center;
  }

  #card-section {
    padding: 0.5em 1em 0 1em;
  }

  #warning-msg {
    padding: 0;
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
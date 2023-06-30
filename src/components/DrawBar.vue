<script>
  export default {
    props: ['drawingState', 'annotations'],
    emits: ['next', 'back', 'drawingStateChange', 'annotationsChange'],
    data() {
      return {
        history: [],
        drawingShape: false,
        warningVisible: false,
      }
    },
    computed: {
      linestringProps() {
        let icon = 'north_east'
        let color = 'primary';

        if (this.drawingState === 'linestring') {
          icon = 'cancel';
          color = 'negative';
        }

        return {'icon': icon, 'color': color};
      },

      nodeProps() {
        let icon = 'radio_button_checked'
        let color = 'primary';

        if (this.drawingState === 'node') {
          icon = 'cancel';
          color = 'negative';
        }

        return {'icon': icon, 'color': color};
      },

      shapeLineProps() {
        let icon = 'line_start_circle'
        let color = 'primary';

        if (this.drawingState === 'shapeLine') {
          icon = 'cancel';
          color = 'negative';
        }

        return {'icon': icon, 'color': color};
      }
    },
    methods: {
      handleNext(event) {
        if (this.annotations.length > 1) {
          this.$emit('next')
        } else {
          // Displays warning if fewer than 2 items have been drawn
          this.warningVisible = true;
          setTimeout(() => {
            this.warningVisible = false;
          }, 5000);
        }
      },
      handleBack(event) {
        this.$emit('back')
      },
      toggleLinestring(event) {
        let state = this.drawingState;
        state = (!state ? 'linestring' : false);
        this.$emit('drawingStateChange', state);
      },
      toggleNode(event) {
        let state = this.drawingState;
        state = (!state ? 'node' : false);
        this.$emit('drawingStateChange', state);
      },
      toggleShape(event) {
        let state = this.drawingState;
        state = false;
        this.drawingShape = !this.drawingShape;
        this.$emit('drawingStateChange', state);
      },
      toggleShapeLine(event) {
        let state = this.drawingState;
        state = (!state ? 'shapeLine' : false);
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
  <div v-if="!drawingShape" class="input-bar-flex">
    <q-btn class="q-py-md" @click="toggleLinestring" label="Linestring" v-bind="linestringProps">
      <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
        Click and drag to draw a line.
      </q-tooltip>
    </q-btn>
    <q-btn class="q-py-md" @click="toggleNode" label="Node" v-bind="nodeProps">
      <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
        Click once on the canvas to place a node.
      </q-tooltip>
    </q-btn>
    <q-btn class="q-py-md" @click="toggleShape" label="Shape" icon="pentagon" color="primary">
      <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
        Draw the outline of a shape.
      </q-tooltip>
    </q-btn>
  </div>

  <div v-else class="input-bar-flex">
    <q-btn class="q-py-md" @click="toggleShapeLine" label="Line" v-bind="shapeLineProps">
      <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
        Click to drop points around the outline of the shape.
      </q-tooltip>
    </q-btn>
    <q-btn class="q-py-md" @click="toggleShape" label="Done" icon="done" color="primary">
      <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
        Shape completed.
      </q-tooltip>
    </q-btn>
  </div>

  <div class="input-bar-flex">
    <q-btn @click="handleBack" label="Back" color="primary"/>
    <q-btn @click="handleUndo" :disabled="!annotations.length" icon="undo" label="Undo" color="secondary"/>
    <q-btn @click="handleRedo" :disabled="!history.length" icon-right="redo" label="Redo" color="secondary"/>
    <q-btn @click="handleNext" label="Next" color="primary"/>
  </div>

  <q-dialog v-model="warningVisible" seamless position="top">
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

  .input-bar-flex {
    gap: 10px;
  }

  button.active {
    background-color: green;
    box-shadow: 0 0 5px 1px black;
  }
</style>
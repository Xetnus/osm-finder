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
    methods: {
      getProps(type) {
        let primaryIconMap = {
          'linestring': 'north_east',
          'node': 'radio_button_checked',
          'rectangle': 'rectangle',
          'circle': 'circle',
          'polygon': 'polyline',
        }

        let icon = primaryIconMap[type];
        let color = 'primary';

        if (this.drawingState === type) {
          icon = 'cancel';
          color = 'negative';
        }

        return {'icon': icon, 'color': color};
      },
      handleNext(event) {
        if (this.annotations.length > 0) {
          this.$emit('next')
        } else {
          // Displays warning if no items have been drawn
          this.warningVisible = true;
          setTimeout(() => {
            this.warningVisible = false;
          }, 5000);
        }
      },
      handleBack(event) {
        this.$emit('back')
      },
      toggleDrawingButton(buttonName) {
        let state = this.drawingState;
        state = (state !== buttonName ? buttonName : false);
        this.$emit('drawingStateChange', state);
      },
      toggleShape(event) {
        let state = this.drawingState;
        state = false;
        this.drawingShape = !this.drawingShape;
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
    <q-btn class="q-py-md" @click="toggleDrawingButton('linestring')" label="Linestring" v-bind="getProps('linestring')">
      <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
        Click and drag to draw a line.
      </q-tooltip>
    </q-btn>
    <q-btn class="q-py-md" @click="toggleDrawingButton('node')" label="Node" v-bind="getProps('node')">
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
    <q-btn class="q-py-md" @click="toggleDrawingButton('rectangle')" label="Rectangle" v-bind="getProps('rectangle')">
      <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
        Click twice to draw a rectangle.
      </q-tooltip>
    </q-btn>
    <q-btn class="q-py-md" @click="toggleDrawingButton('circle')" label="Circle" v-bind="getProps('circle')">
      <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
        Click once at the center of the circle and click again on its radius.
      </q-tooltip>
    </q-btn>
    <q-btn class="q-py-md" @click="toggleDrawingButton('polygon')" label="Polygon" v-bind="getProps('polygon')">
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
        <div id="warning-msg">Place at least one object.</div>
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
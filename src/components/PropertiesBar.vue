<script>
  export default {
    props: ['annotations', 'propertiesHistory'],
    emits: ['next', 'back', 'annotationsChange', 'propertiesHistoryChange'],
    beforeMount() {
      if (this.propertiesHistory == -1) {
        this.handleNext();
      } else {
        this.currentIndex = this.propertiesHistory;
        this.handleBack();
      }
    },
    data() {
      return {
        types: {
          'linestring': {'highway': ['vehicle', 'path'], 'railway': [], 'power': ['line', 'minor_line']},
          'node': {'man_made': []}
        },
        defaults: {
          'linestring': {'genericTypeSelected': 'highway', 'subtypeSelected': '', 'subtypeTyped': '', 'tagsTyped': ''},
          'node': {'genericTypeSelected': 'man_made', 'subtypeSelected': '', 'subtypeTyped': '', 'tagsTyped': ''}
        },
        genericTypeSelected: '',
        subtypeSelected: '',
        subtypeTyped: '',
        tagsTyped: '',
        currentIndex: -1,
        anns: JSON.parse(JSON.stringify(this.annotations)),
      }
    },
    computed: {
      currentAnn() {
        return this.anns[this.currentIndex];
      }
    },
    methods: {
      handleNext(event) {
        if (this.currentIndex >= 0) {
          // Commit these properties to the global state
          this.anns[this.currentIndex].genericType = this.genericTypeSelected;
          this.anns[this.currentIndex].subtype = this.subtypeTyped || this.subtypeSelected;
          if (this.tagsTyped)
            this.anns[this.currentIndex].tags = [...this.tagsTyped.split(',')];
        }

        if (this.currentIndex >= this.anns.length - 1) {
          this.showAll();
          this.$emit('propertiesHistoryChange', this.currentIndex + 1);
          this.$emit('next');
        } else {
          this.currentIndex++;
          this.fillInForm();
          this.hideAllButOne(this.currentAnn);
        }
      },

      handleBack(event) {
        if (this.currentIndex == 0) {
          this.showAll();
          this.$emit('propertiesHistoryChange', -1);
          this.$emit('back');
        } else {
          this.currentIndex--;
          this.fillInForm();
          this.hideAllButOne(this.currentAnn);
        }
      },

      fillInForm() {
        // Initializes the inputs to the defaults or, if data has already been stored
        // for this relation, fills that data in.
        const defaults = this.defaults[this.currentAnn.geometryType];

        this.genericTypeSelected = this.currentAnn.genericType || defaults.genericTypeSelected;
        if (this.getSubtypes().length == 0) {
          this.subtypeTyped = this.currentAnn.subtype || defaults.subtypeTyped;
          this.subtypeSelected = '';
        } else {
          this.subtypeSelected = this.currentAnn.subtype || defaults.subtypeSelected;
          this.subtypeTyped = '';
        }
        this.tagsTyped = this.currentAnn.tags.join(',') || defaults.tagsTyped;
      },

      hideAllButOne(hide) {
        for (let i = 0; i < this.anns.length; i++) {
          this.anns[i].state = (this.anns[i].name == hide.name) ? 'default' : 'transparent';
        }
        this.$emit('annotationsChange', this.anns);
      },

      showAll() {
        for (let i = 0; i < this.anns.length; i++) {
          this.anns[i].state = 'default';
        }
        this.$emit('annotationsChange', this.anns);
      },

      genericTypeChange(event) {
        // Resets the subtype field if the generic type is changed
        this.subtypeSelected = '';
        this.subtypeTyped = '';
      },

      getGenericTypes() {
        return Object.keys(this.types[this.currentAnn.geometryType]);
      },

      getSubtypes() {
        return this.types[this.currentAnn.geometryType][this.genericTypeSelected];
      },
    }
  }
</script>

<template>
  <p>Properties for {{currentAnn.name}}</p>
  <div>
    <button @click="handleBack" id="back">Back</button>
    <select v-model="genericTypeSelected" @change="genericTypeChange">
      <option v-for="generic in getGenericTypes()" :value="generic">{{generic}}</option>
    </select>

    <!-- Either displays <select> or <input> depending on the subtypes available -->
    <select v-if="genericTypeSelected && getSubtypes().length" v-model="subtypeSelected">
      <option value="">Any Subtype</option>
      <option v-for="sub in getSubtypes()" :value="sub">{{sub}}</option>
    </select>
    <input v-else v-model="subtypeTyped" placeholder="Subtype"/>

    <input v-model="tagsTyped" placeholder="Tags: bridge=yes"/>
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

  select, input {
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

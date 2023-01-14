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
        currentIndex: -1,
        anns: JSON.parse(JSON.stringify(this.annotations)),
        tags: [],
        defaultCategory: 'None',
        currentCategory: this.defaultCategory,
        allCategories: {
          'node': ['None', 'Building', 'Railway', 'Power', 'Man Made'],
          'linestring': ['None', 'Walkway', 'Roadway', 'Railway', 'Power', 'Waterway', 'Coastline', 'Man Made'],
          // 'area': ['None', 'Building', 'Waterway', 'Coastline'],
        },
        categoryList: null,
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
          this.saveProperties();
        }

        if (this.currentIndex >= this.anns.length - 1) {
          this.$emit('annotationsChange', this.anns);
          this.$emit('propertiesHistoryChange', this.currentIndex + 1);
          this.$emit('next');
        } else {
          this.currentIndex++;
          this.fillInForm();
          this.hideAllButOne(this.currentAnn);
        }
      },

      handleBack(event) {
        if (this.currentIndex < this.anns.length) {
          this.saveProperties();
        }

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

      saveProperties() {
        this.currentAnn.tags = [];
        for (let i = 0; i < this.tags.length; i++) {
          this.currentAnn.tags.push(this.tags[i].value);
        }

        this.currentAnn.category = this.currentCategory;
      },

      fillInForm() {
        // Initializes the inputs to the defaults or, if data has already been stored
        // for this relation, fills that data in.

        if (this.currentAnn.tags.length > 0) {
          this.tags = [];
          for (let i = 0; i < this.currentAnn.tags.length; i++) {
            this.tags.push({key: '', value: this.currentAnn.tags[i]});
          }
        } else {
          this.tags = [];
        }

        this.categoryList = this.allCategories[this.currentAnn.geometryType];
        this.currentCategory = this.currentAnn.category ? this.currentAnn.category : this.defaultCategory;
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
    }
  }
</script>

<template>
  <p>Properties for {{currentAnn.name}}</p>
  <div>
    <q-btn @click="handleBack" id="back" label="Back" color="primary"/>
    <q-select standout="bg-secondary text-white" v-model="currentCategory" :options="categoryList"
      label="Category" color="primary" style="width:100%; max-width:150px;"/>

    <tags-input element-id="tags"
      v-model="tags"
      :existing-tags="[
        // TODO
      ]"
      :add-tags-on-space="true" :add-tags-on-comma="true" :add-tags-on-blur="true" :delete-on-backspace="true">
    </tags-input>

    <q-btn @click="handleNext" id="next" label="Next" color="primary"/>
  </div>
</template>

<style scoped>
  p {
    font-weight: bold;
    font-size: 20px;
    text-align: center;
    margin-bottom: 0.4em;
  }

  div {
    display: flex;
    gap: 20px;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }
</style>

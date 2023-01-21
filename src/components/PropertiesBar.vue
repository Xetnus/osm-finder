<script>
  import json from '../assets/categories.json'
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

        allCategoryOptions: {
          'node': ['Building', 'Railway', 'Power', 'Man Made'],
          'linestring': ['Walkway', 'Roadway', 'Railway', 'Power', 'Waterway', 'Coastline', 'Man Made'],
          // 'area': ['Any', 'Building', 'Waterway', 'Coastline'],
        },
        currentCategory: null,
        currentCategoryOptions: null,

        defaultSubcategory: 'Any',
        allSubcategoryOptions: ['Any'],
        currentSubcategory: this.defaultSubcategory,
        currentSubcategoryOptions: this.allSubcategoryOptions,

        allTagOptions: ['Google', 'Facebook', 'Twitter', 'Apple', 'Oracle'],
        currentTagOptions: this.allTagOptions,
        tags: [],
        tagText: null,
        subcategoryText: null,
      }
    },
    computed: {
      currentAnn() {
        return this.anns[this.currentIndex];
      },
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
          this.currentAnn.tags.push(this.tags[i]);
        }

        this.currentAnn.category = this.uncleanText(this.currentCategory);
        this.currentAnn.subcategory = this.uncleanText(this.currentSubcategory);
      },

      // Initializes the inputs to the defaults or, if data has already been stored
      // for this relation, fills that data in.
      fillInForm() {
        if (this.currentAnn.tags.length > 0) {
          this.tags = [];
          for (let i = 0; i < this.currentAnn.tags.length; i++) {
            this.tags.push(this.currentAnn.tags[i]);
          }
        } else {
          this.tags = [];
        }

        this.currentCategoryOptions = this.allCategoryOptions[this.currentAnn.geometryType];
        const cat = this.currentAnn.category ? this.currentAnn.category : this.currentCategoryOptions[0];
        this.currentCategory = this.cleanText(cat);

        this.categoryChanged(this.currentCategory);
        if (this.currentAnn.subcategory) {
          this.currentSubcategory = this.cleanText(this.currentAnn.subcategory);
        }
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

      // Converts raw text into a user-friendly label (e.g. man_made => Man Made)
      cleanText(text) {
        if (text === '')
          return this.cleanText(this.defaultSubcategory);

        let clean = text.replaceAll('_', ' ');
        clean = clean.toLowerCase().split(' ')
          .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
          .join(' ');
        return clean;
      },

      // Converts cleaned labels into its raw text form (e.g. Man Made => man_made)
      uncleanText(text) {
        if (text.toLowerCase() === this.defaultSubcategory.toLowerCase())
          return '';
        return text.toLowerCase().replaceAll(' ', '_');
      },

      // Updates the subcategory options if the main category is changed
      categoryChanged(val) {
        const unclean = this.uncleanText(val);

        if (json[unclean]) {
          let cleanedOptions = [];
          for (let i = 0; i < json[unclean].length; i++) {
            let clean = this.cleanText(json[unclean][i]);
            cleanedOptions.push(clean);
          }
          this.allSubcategoryOptions = [this.defaultSubcategory].concat(cleanedOptions);
        } else {
          this.allSubcategoryOptions = [this.defaultSubcategory];
        }

        this.currentSubcategory = this.defaultSubcategory;
      },

      // Checks for tag breaks (spaces, commas, semicolons) and creates a
      // new tag if a break is detected
      setTagSelection (val) {
        this.tagText = val;

        let breaks = [' ', ',', ';'];

        if (val && val.trim().length > 0) {
          if (breaks.includes(val.substring(val.length - 1))) {
            let trimmed = val.substring(0, val.length - 1).trim();
            if (!this.tags.includes(trimmed)) {
              this.tags.push(trimmed);
            }
            this.tagText = null;
            this.$.refs.tagsSelect.updateInputValue('');
          }
        }
      },
      
      // If focus is removed from the select box, anything the user
      // typed will automatically be saved as a tag
      checkTagSelection () {
        if (this.tagText && this.tagText.length > 0) {
          if (this.tags.indexOf(this.tagText) === -1) {
            this.tags.push(this.tagText)
          }
          this.tagText = null;
        }
      },

      // Keeps an updated record of the user's custom subcategory typing
      setSubcategorySelection (val) {
        this.subcategoryText = val;
      },
      
      // If focus is removed from the select box, anything the user
      // typed will automatically be entered as the subcategory
      checkSubcategorySelection () {
        if (this.subcategoryText && this.subcategoryText.length > 0) {
          this.currentSubcategory = this.subcategoryText;
          this.currentSubcategoryOptions.push(this.subcategoryText);
          this.subcategoryText = null;
        }
      },

      // tagFilterFn (val, update, abort) {
      //   setTimeout(() => {
      //     update(
      //       () => {
      //         if (val === '') {
      //           this.currentTagOptions = this.allTagOptions
      //         }
      //         else {
      //           const needle = val.toLowerCase()
      //           this.currentTagOptions = this.allTagOptions.filter(v => v.toLowerCase().indexOf(needle) > -1)
      //         }
      //       }
      //     )
      //   }, 100)
      // },

      subcategoryFilterFn (val, update) {
        update(
          // Filters the subcategory options based on what the user has typed
          () => {
            if (val === '') {
              this.currentSubcategoryOptions = this.allSubcategoryOptions;
            } else {
              const needle = val.toLowerCase();
              this.currentSubcategoryOptions = this.allSubcategoryOptions.filter(
                v => v.toLowerCase().indexOf(needle) > -1
              )
            }
          },

          // Automatically highlights the first option
          ref => {
            if (val !== '' && ref.options.length > 0) {
              ref.setOptionIndex(-1) // reset optionIndex in case there is something selected
              ref.moveOptionSelection(1, true) // focus the first selectable option and do not update the input-value
            }
          }
        )
      },

      createNewSubcategory (val, done) {
        if (val.length > 0) {
          if (!this.allSubcategoryOptions.includes(val)) {
            this.allSubcategoryOptions.push(val);
          }
          done(val, 'toggle');
        }
      },
    }
  }
</script>

<template>
  <p class="input-title">Properties for {{currentAnn.name}}</p>
  <div class="input-bar-flex">
    <div>
      <q-btn @click="handleBack" label="Back" color="primary" class="q-py-md"/>
    </div>

    <q-select
      class="category-select" outlined label="Category"
      bg-color="secondary" label-color="white" input-style="color: white" popup-content-style="color: black"
      v-model="currentCategory" :options="currentCategoryOptions"
      @update:model-value="categoryChanged">
    </q-select>

    <q-select
      class="subcategory-select" outlined label="Subcategory"
      bg-color="secondary" label-color="white" input-style="color: white" popup-content-style="color: black"
      use-input input-debounce="0"
      v-model="currentSubcategory" :options="currentSubcategoryOptions" 
      @new-value="createNewSubcategory" @filter="subcategoryFilterFn"
      @input-value="setSubcategorySelection" @focus="setSubcategorySelection(null)" @blur="checkSubcategorySelection">
    </q-select>

        <!-- :options="currentTagOptions"
        input-debounce="0"
        @filter="tagFilterFn" -->
    <q-select
      bg-color="secondary" input-style="color: white" popup-content-style="color: black"
      label-color="white" style="width: 400px"
      standout
      hide-dropdown-icon
      multiple
      use-input
      fill-input
      use-chips
      ref="tagsSelect"
      label="Tags"
      v-model="tags"
      @input-value="setTagSelection"
      @focus="setTagSelection(null)"
      @blur="checkTagSelection"
    >
      <q-tooltip class="bg-secondary text-body2" anchor="top middle" self="bottom middle" :offset="[10, 10]" :delay="600">
        Enter OpenStreetMap tags separated by spaces.
      </q-tooltip>
      <!-- <template v-slot:no-option>
        <q-item>
          <q-item-section class="text-grey">
            No results
          </q-item-section>
        </q-item>
      </template> -->
    </q-select>

    <div>
      <q-btn @click="handleNext" label="Next" color="primary" class="q-py-md"/>
    </div>
  </div>
</template>

<style scoped>
  .button-wrapper {
    padding-bottom: auto;
  }

  .category-select {
    width: 100%;
    max-width: 140px;
  }

  .subcategory-select {
    width: 100%;
    max-width: 200px;
  }
</style>

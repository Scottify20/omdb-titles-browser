import { SvgStrings } from '../../assets/svg-strings/SvgStrings';
import { TitlePropsParsed, OmdbTitleDetailsFetch } from '../../utils/omdb/OmdbTitleDetailsFetch';

const bodyScrollLock = require('body-scroll-lock-upgrade');
const disableBodyScroll = bodyScrollLock.disableBodyScroll;
const enableBodyScroll = bodyScrollLock.enableBodyScroll;

import {
  insertHTMLInsideElementById,
  elementByIdExists,
  elementFromHTMLString,
} from '../../utils/GlobalUtils';
import { TitleDetailsSkeletonLoader } from './skeleton_loader/TitleDetailsSkeletonLoader';
import { SearchResultsContainer } from '../search_results_container/SearchResultsContainer';
import { TmdbPropsToPass } from '../homepage/trending/TrendingMedia';
import { TrailerEmbed } from '../homepage/trailer_embed/TrailerEmbed';
import { TmdbFetchVideoProps, TmdbFetchVideos } from '../../utils/tmdb/TmdbFetchVideos';
import { tmdbTitleTypes } from '../../utils/tmdb/TmdbFetch';

export class TitleDetailsRenderer {
  static [key: string]: any; // static index signature
  private static _IsOn = false;
  private static _titleData: TitlePropsParsed;
  private static _viewingAlreadyActive = false;

  constructor(isOn: boolean) {
    TitleDetailsRenderer._IsOn = isOn;
  }

  static async viewTitle(imdbId: string, tmdbProps?: TmdbPropsToPass) {
    if (this._IsOn) {
      if (this._viewingAlreadyActive) {
        return;
      }

      TitleDetailsRenderer._viewingAlreadyActive = true;
      setTimeout(() => {
        TitleDetailsRenderer._viewingAlreadyActive = false;
      }, 2000);

      // check if already in cache
      if (OmdbTitleDetailsFetch.istitleInCache(imdbId)) {
        this.viewCachedTitle(imdbId, tmdbProps);
        return;
      }

      TitleDetailsSkeletonLoader.show();

      if (tmdbProps) {
        this._titleData = (await OmdbTitleDetailsFetch.getTitleData(
          imdbId,
          tmdbProps
        )) as TitlePropsParsed;
      } else {
        this._titleData = (await OmdbTitleDetailsFetch.getTitleData(imdbId)) as TitlePropsParsed;
      }

      // console.log(this._titleData);
      setTimeout(() => {
        this.renderTitleDetailsWindow();
        TitleDetailsSkeletonLoader.showSkeletonForFadeout();
        this.bindData();

        if (tmdbProps) {
          this.bindActionButtonsData(tmdbProps);
          this.actionButtonsListener(tmdbProps);
        } else {
          const tmdbEmptyProps: TmdbPropsToPass = {
            tmdbTitle: '',
            description: '',
            posterURL: '',
            tmdbID: 'no-id',
            titleType: 'tv',
          };
          this.bindActionButtonsData(tmdbEmptyProps);
        }

        this.startCloseButtonController();
        this.showParentElementsAfterDataBinding();
        this.windowsOverflowingClassToggle();
        TitleDetailsSkeletonLoader.fadeOut();
        this.escapeButtonToCloseListener();
        // this.setFocusToTitleDetailsWindow();
        this.closeButtonAndBackdropListener();
      }, 500);
    }

    this.ac;
  }

  private static windowsOverflowingClassToggle() {
    const titleDetails = document.getElementById('title-details') as HTMLElement;
    const backdrop = document.getElementById('title-details__backdrop');
    const isOverflowing = () => {
      return titleDetails.offsetHeight > window.innerHeight - window.innerHeight * 0.05;
    };
    // console.log(titleDetails.offsetHeight, window.innerHeight - window.innerHeight * 0.05);
    backdrop?.classList.toggle('overflowing', isOverflowing());
  }

  private static async viewCachedTitle(imdbId: string, tmdbProps?: TmdbPropsToPass) {
    // console.log('title in cache');
    TitleDetailsRenderer._viewingAlreadyActive = true;
    setTimeout(() => {
      TitleDetailsRenderer._viewingAlreadyActive = false;
    }, 2000);

    this._titleData = OmdbTitleDetailsFetch.getCachedTitleData(imdbId);
    this.renderTitleDetailsWindow();
    this.bindData();
    if (tmdbProps) {
      this.bindActionButtonsData(tmdbProps);
      this.actionButtonsListener(tmdbProps);
    } else {
      const tmdbEmptyProps: TmdbPropsToPass = {
        tmdbTitle: '',
        description: '',
        posterURL: '',
        tmdbID: 'no-id',
        titleType: 'tv',
      };
      this.bindActionButtonsData(tmdbEmptyProps);
    }
    this.startCloseButtonController();
    this.escapeButtonToCloseListener();
    this.closeButtonAndBackdropListener();
    this.showParentElementsAfterDataBinding();
    this.windowsOverflowingClassToggle();
    const titleDetailsWindow = document.getElementById('title-details') as HTMLElement;
    const titleDetailsBackdrop = document.getElementById('title-details__backdrop') as HTMLElement;
    // to add the slide in animation
    titleDetailsWindow.classList.add('shown-skip-skeleton');
    titleDetailsBackdrop.classList.add('shown-skip-skeleton');

    // to remove the slide in animation after the animation has finished
    // because the animation disables the fixed property set to the close button
    setTimeout(() => {
      titleDetailsWindow.classList.remove('shown-skip-skeleton');
      titleDetailsBackdrop.classList.remove('shown-skip-skeleton');
    }, 550);
  }

  private static startCloseButtonController() {
    const titleDetailsContainer = document.getElementById(
      'title-details__container'
    ) as HTMLElement;
    const closeButton = document.getElementById('title-details__close-btn') as HTMLElement;

    if (window.innerWidth < 768) {
      closeButton.classList.add('low-opacity');
    }

    titleDetailsContainer.addEventListener('scroll', () => {
      const scrollDistance = titleDetailsContainer.scrollTop;
      if (scrollDistance > 26) {
        closeButton.classList.remove('low-opacity');
      } else {
        closeButton.classList.add('low-opacity');
      }
    });
  }

  private static bindData() {
    // binding text contents to the elements listed in the property _propPlainDataAndElementIdMap
    for (const keyArrayPair of this._propPlainDataAndElementIdMap) {
      const key = Object.keys(keyArrayPair)[0];
      const id = keyArrayPair[key][0];
      const type = keyArrayPair[key][1];
      const data = this._titleData?.[key] as string;

      this.bindTextContentOrURLToElementById(id, data, type);
    }

    // binding child element and their text contents to the parent elements listed in the property _propArrayOfStringAndParentIdMap
    for (const keyArrayPair of this._propArrayOfStringAndParentIdMap) {
      const key = Object.keys(keyArrayPair)[0];
      const parentId = keyArrayPair[key][0];
      const templateKey = keyArrayPair[key][1];
      const type = keyArrayPair[key][2];
      const data = this._titleData?.[key] as string[];
      const classOfElement = keyArrayPair[key][3];

      this.bindChildElementsToParentElement(parentId, templateKey, data, type, classOfElement);
    }

    // binding the rating scores and some styling to rating section
    // the property _propRatingDataAndElementIdMap
    if (this.propNotNull('Ratings')) {
      // for excluding
      for (const keyArrayPair of this._propRatingDataAndElementIdMap) {
        const keySource = Object.keys(keyArrayPair)[0] as
          | 'Internet Movie Database'
          | 'Rotten Tomatoes'
          | 'Metacritic';

        const elementIdForScore = keyArrayPair[keySource][0];

        const elementIdForStyling = keyArrayPair[keySource][1];

        const ratingFound = (): { Source: string; Value: number } => {
          const ratings = this._titleData.Ratings;
          if (ratings.find((rating) => rating.Source === keySource)) {
            return ratings.find((rating) => rating.Source === keySource) as {
              Source: string;
              Value: number;
            };
          } else {
            return { Source: keySource, Value: 0 };
          }
        };

        const score = ratingFound().Value;

        this.bindRatingScoreAndStyling(keySource, score, elementIdForScore, elementIdForStyling);
      }
    }

    // checks if the numbers of child sections inside the other info section container is either odd or even
    // if odd the class of "odd-section" will be added to the container
    // "even-section" if it even
    this.bindEvenOrOddChildrenSectionOfContainerClass('title-details-joined-section-container', [
      'Language',
      'Country',
      'Released',
      'DVD',
      'BoxOffice',
    ]);
  }

  // since the title details window and backdrop is hiddent by default (see .hidden scss class)
  private static showParentElementsAfterDataBinding() {
    const titleDetailsContainer = document.getElementById('title-details__container');
    const titleDetailsBackdrop = document.getElementById('title-details__backdrop');

    titleDetailsContainer?.classList.remove('hidden');
    titleDetailsBackdrop?.classList.remove('hidden');
  }

  private static bindActionButtonsData(tmdbProps: TmdbPropsToPass) {
    const actionButtonsContainer = document.getElementById(
      'title-details__action-buttons-container'
    ) as HTMLElement;

    if (tmdbProps.tmdbID === 'no-id') {
      document
        .getElementById('title-details-action--play-trailer')
        ?.classList.add('button-disabled');
    }

    actionButtonsContainer.setAttribute('data-tmdb-id', tmdbProps.tmdbID);
    actionButtonsContainer.setAttribute('data-title-type', tmdbProps.titleType);
  }

  private static async actionButtonsListener(tmdbProps: TmdbPropsToPass) {
    const actionButtonsContainer = document.getElementById(
      'title-details__action-buttons-container'
    ) as HTMLElement;

    actionButtonsContainer.addEventListener('click', async (event) => {
      const target = event.target as HTMLElement;

      if (target.classList.contains('title-details__play-trailer-btn')) {
        const key = await TmdbFetchVideos.fetchYoutubeTrailerPriorityKey(
          parseInt(tmdbProps.tmdbID),
          tmdbProps.titleType
        );

        if (key) {
          TrailerEmbed.render(key);
        } else {
          const trailers = (await TmdbFetchVideos.fetchVideos(
            parseInt(tmdbProps.tmdbID),
            'movie'
          )) as TmdbFetchVideoProps[];
          try {
            const trailerKeyFallback = trailers[0].key;
            TrailerEmbed.render(trailerKeyFallback);
            console.log('using fallback first video');
          } catch {
            ////////////////////
            console.log('no video found');
            TrailerEmbed.disablePlayTrailerButton('title-details-action--play-trailer');
          }
        }
      }
    });
  }

  private static closeButtonAndBackdropListener() {
    const closeButton = document.getElementById('title-details__close-btn');
    closeButton?.addEventListener('click', () => {
      this.hideDialogAndBackdrop();
    });

    const backdrop = document.getElementById('title-details__backdrop');

    backdrop?.addEventListener('click', () => {
      this.hideDialogAndBackdrop();
    });
  }

  private static escapeButtonToCloseListener() {
    const titleDetailsWindow = document.getElementById('title-details');
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && titleDetailsWindow) {
        // console.log('escape pressed');
        this.hideDialogAndBackdrop();
      }
    });
  }

  public static hideDialogAndBackdrop() {
    this._viewingAlreadyActive = false;
    const titleDetailsContainer = document.getElementById('title-details__container');
    const titleDetails = document.getElementById('title-details');
    const titleDetailsBackdrop = document.getElementById('title-details__backdrop');

    titleDetails?.classList.add('closed');
    titleDetailsBackdrop?.classList.add('closed');

    setTimeout(() => {
      const dialog = document.getElementById('title-details__container') as HTMLDialogElement;

      titleDetailsContainer?.remove();
      titleDetailsBackdrop?.remove();

      enableBodyScroll(dialog);
      document.body.classList.remove('scroll-disabled');
      if (!SearchResultsContainer.isShown) {
        document.body.style.overflow = 'auto';
      }
    }, 400);
  }

  private static propNotNull(...propKeys: string[]): boolean {
    for (const propKey of propKeys) {
      if (this._titleData && this._titleData[propKey] && this._titleData[propKey] !== 'N/A') {
        const property = this._titleData[propKey];
        let propArrayIsNotEmpty = true;
        let propIsArray = Array.isArray(property);

        if (propIsArray) {
          const propArray = property as string[] | number[];
          if (propArray[0] && propArray[0] !== 'N/A') {
            propArrayIsNotEmpty = true;
          } else {
            propArrayIsNotEmpty = false;
          }
        }
        // ternary operator
        // return the value of propArrayIsNotEmpty (true or false) if property is and array
        // return true if property is not an array since the false conditon for non array properties is below
        return propIsArray ? propArrayIsNotEmpty : true;
      } else {
        return false;
      }
    }
    return false;
  }

  private static renderTitleDetailsWindow() {
    document.body.insertAdjacentHTML('afterbegin', this.templateTitleDetailsContainer);

    // document.body.style.overflow = 'hidden';
    const dialog = document.getElementById('title-details__container') as HTMLDialogElement;
    disableBodyScroll(dialog);
    document.body.classList.add('scroll-disabled');
    dialog.showModal();

    // insert backdrop to body
    // document.body.insertAdjacentHTML('afterbegin', this.templateTitleDetailsBackdrop);

    // insert the title details window to the parent container
    insertHTMLInsideElementById(this.templateTitleDetails, 'title-details__container');
    // hero section
    insertHTMLInsideElementById(this.templateHero, 'title-details');

    insertHTMLInsideElementById(this.templateSectionsContainer, 'title-details');

    // metatada subsection
    if (elementByIdExists('title-details__metadata-container')) {
      const metadataKeyList = ['Type', 'Year', 'Rated', 'Runtime'];

      const availableKeys = (): string[] => {
        const availKeys: string[] = [];
        metadataKeyList.forEach((key) => {
          if (this.propNotNull(key)) {
            availKeys.push(key);
          }
        });
        return availKeys;
      };

      for (let i = 0; i < availableKeys().length; i++) {
        const metaDataKey = availableKeys()[i];

        if (this.propNotNull(metaDataKey)) {
          const fulltTemplateName = `templateSubsectionMetadata${metaDataKey}`;
          insertHTMLInsideElementById(this[fulltTemplateName], 'title-details__metadata-container');

          // for the dot separators
          if (i !== availableKeys().length - 1) {
            insertHTMLInsideElementById(
              this.templateDotSeparatorMetadata,
              'title-details__metadata-container'
            );
          }
        }
      }
    }

    // poster
    if (this.propNotNull('Poster')) {
      const referenceElement = document.getElementById('title-details__metadata-container');
      referenceElement?.insertAdjacentHTML('afterend', this.templateSubsectionPoster);
    }

    // plot subsection
    if (this.propNotNull('Plot')) {
      const referenceElement = document.getElementById('title-data-container--genre');
      referenceElement?.insertAdjacentHTML('afterend', this.templateSubsectionPlot);
    }

    if (this.propNotNull('Ratings')) {
      // ratings section container
      insertHTMLInsideElementById(this.templateSectionRatings, 'title-details__sections-container');
      if (this.ratingExists('Internet Movie Database')) {
        // imdb rating
        insertHTMLInsideElementById(
          this.templateSubsectionRatingImdb,
          'title-details__ratings-container'
        );
      }
      if (this.ratingExists('Rotten Tomatoes')) {
        // rotten tomateos rating fresh
        insertHTMLInsideElementById(
          this.templateSubsectionRatingRT,
          'title-details__ratings-container'
        );
      }
      if (this.ratingExists('Metacritic')) {
        // metacritic rating
        insertHTMLInsideElementById(
          this.templateSubsectionRatingMetacritic,
          'title-details__ratings-container'
        );
      }
    }

    if (this.propNotNull('totalSeasons')) {
      // seasons
      insertHTMLInsideElementById(this.templateSectionSeasons, 'title-details__sections-container');
    }
    if (this.propNotNull('Actors')) {
      // cast
      insertHTMLInsideElementById(this.templateSectionCast, 'title-details__sections-container');
    }
    if (this.propNotNull('Director')) {
      // directors
      insertHTMLInsideElementById(
        this.templateSectionDirectors,
        'title-details__sections-container'
      );
    }
    if (this.propNotNull('Writer')) {
      // writers
      insertHTMLInsideElementById(this.templateSectionWriters, 'title-details__sections-container');
    }
    if (this.propNotNull('Awards')) {
      // Awards
      insertHTMLInsideElementById(this.templateSectionAwards, 'title-details__sections-container');
    }

    // the other info section (contains the sections 'Language', 'Country', 'Released', 'DVD', 'BoxOffice')
    if (this.propNotNull('Language', 'Country', 'Released', 'DVD', 'BoxOffice')) {
      // at least one of the subsections in the other info section is not null or N/A
      // Other info container
      insertHTMLInsideElementById(
        this.templateSectionOtherInfo,
        'title-details__sections-container'
      );

      if (this.propNotNull('Language')) {
        // insert language on other info
        insertHTMLInsideElementById(
          this.templateSubsectionLanguage,
          'title-details-joined-section-container'
        );
      }
      if (this.propNotNull('Country')) {
        // insert country on other info
        insertHTMLInsideElementById(
          this.templateSubsectionCountry,
          'title-details-joined-section-container'
        );
      }
      if (this.propNotNull('Released')) {
        // insert release date on other info
        insertHTMLInsideElementById(
          this.templateSubsectionReleaseDate,
          'title-details-joined-section-container'
        );
      }
      if (this.propNotNull('DVD')) {
        // insert dvd release on other info
        insertHTMLInsideElementById(
          this.templateSubsectionDVD,
          'title-details-joined-section-container'
        );
      }
      if (this.propNotNull('BoxOffice')) {
        // insert box office earnings on other info
        insertHTMLInsideElementById(
          this.templateSubsectionBoxOffice,
          'title-details-joined-section-container'
        );
      }
    }
  }

  private static ratingExists(sourceName: string): boolean {
    if (this._titleData) {
      return this._titleData.Ratings.some((sourceObj) => {
        return sourceObj.Source === sourceName;
      });
    }
    return false;
  }

  // checks if the numbers of sections inside a container is either odd or even
  // if odd the class of "odd-section" will be added to the container
  // "even-section" if it even
  private static bindEvenOrOddChildrenSectionOfContainerClass(
    containerId: string,
    childElementsPropKeys: string[]
  ) {
    let sectionsInside = 0;

    for (const propKey of childElementsPropKeys) {
      if (this.propNotNull(propKey)) {
        sectionsInside++;
      }
    }

    const evenOrOdd = () => (sectionsInside % 2 === 0 ? 'even' : 'odd');
    const containerElement = document.getElementById(containerId);

    if (evenOrOdd() === 'even') {
      containerElement?.classList.add('even-section');
    } else {
      containerElement?.classList.add('odd-section');
    }
  }

  private static bindRatingScoreAndStyling(
    source: 'Internet Movie Database' | 'Rotten Tomatoes' | 'Metacritic',
    score: number,
    elementIdForScore: string,
    elementIdForStyling: string
  ) {
    // binding score
    if (elementByIdExists(elementIdForScore)) {
      const elementForScore = document.getElementById(elementIdForScore) as Element;
      elementForScore.textContent = score.toString();
    }

    // binding styling or svg icon
    if (elementByIdExists(elementIdForStyling)) {
      const elementForStyling = document.getElementById(elementIdForStyling) as Element;

      if (source === 'Rotten Tomatoes') {
        const rating = () => (score > 75 ? 'certified-fresh' : score > 60 ? 'fresh' : 'rotten');

        elementForStyling.prepend(elementFromHTMLString(this.rtSvgStringSelector(rating())));
      }

      if (source === 'Metacritic') {
        const color = () => (score > 75 ? 'green' : score > 50 ? 'yellow' : 'red');
        elementForStyling.classList.add(color());
      }
    }
  }

  private static bindTextContentOrURLToElementById(
    elementId: string,
    data: string | string[],
    type: 'textContent' | 'imageUrlSrc' | 'yearArray'
  ) {
    if (elementByIdExists(elementId)) {
      const element = document.getElementById(elementId) as Element;
      if (type === 'textContent') {
        element.textContent = data as string;
      } else if (type === 'imageUrlSrc') {
        // if the element is an img
        element.setAttribute('src', data as string);
      } else if (type === 'yearArray') {
        // if the data is an array of years
        element.textContent = (data as string[]).join('-');
      }
    } else {
      // console.log(`element with id: ${elementId} does not exist`);
    }
  }

  private static bindChildElementsToParentElement(
    parentId: string,
    templateKey: string,
    data: string[],
    type: 'not' | 'dot-separated',
    classOfElementToInsertDataTo: string
  ) {
    if (elementByIdExists(parentId)) {
      for (let i = 0; i < data.length; i++) {
        const template = document.createElement('div');
        template.innerHTML = this[templateKey];
        // to add unique ids for every item (this is unnecessary for now might be useful in the future)
        // example: title-data-container--country becomes title-data--country-0
        // which will become the id of the inserted template element
        template.firstElementChild?.setAttribute(
          'id',
          `${parentId.replace('-container', '')}--${i}`
        );

        // add the data (textContent) to the child element or its subelement
        const elementToInsertDataTo = template.querySelector(`.${classOfElementToInsertDataTo}`);
        if (elementToInsertDataTo) {
          elementToInsertDataTo.textContent = data[i];
        }
        // insert template element to parent
        insertHTMLInsideElementById(template.innerHTML, parentId);

        if (type === 'dot-separated' && i < data.length - 1) {
          // Writer // Actors // Language // Country // Director
          // insert dot separator after every appended element except the last element
          insertHTMLInsideElementById(this.templateDotSeparatorTextItem, parentId);
        }
      }
    }
  }

  // key is the source of rating
  // first value in array is the id of element to put the score data into
  // second optional value in array is the id for:
  //metacritic logo where the color of the circular stroke around the logo changes based on the score
  // and for the id of the parent element of rotten tomatoes rating
  // the svg icon rt changes based on the score
  private static _propRatingDataAndElementIdMap: { [key: string]: [string, string] }[] = [
    { 'Internet Movie Database': ['title-data--imdb-score', 'N/A'] },
    { 'Rotten Tomatoes': ['title-data--rt-score', 'title-details__rating--rotten-tomatoes'] },
    { Metacritic: ['title-data--metacritic-score', 'ratings-logo--metacritic'] },
  ];

  // the key is the property key from the parsed title data
  // the first value in the array is the element's id
  // the second value means which property of the element will be replaced with the value (whether its the element's textContent,  the src attribute if the element's an img) and
  // the year is a special case since it has an array of strings but will be rendered a joined string
  private static _propPlainDataAndElementIdMap: {
    [key: string]: [`title-data--${string}`, 'textContent' | 'imageUrlSrc' | 'yearArray'];
  }[] = [
    { Title: ['title-data--title', 'textContent'] },
    { Type: ['title-data--type', 'textContent'] },
    { Year: ['title-data--year', 'yearArray'] },
    { Rated: ['title-data--rating', 'textContent'] },
    { Runtime: ['title-data--runtime', 'textContent'] },
    { Plot: ['title-data--plot', 'textContent'] },
    { Awards: ['title-data--awards', 'textContent'] },
    { BoxOffice: ['title-data--box-office', 'textContent'] },
    { Released: ['title-data--release-date', 'textContent'] },
    { DVD: ['title-data--dvd', 'textContent'] },
    { totalSeasons: ['title-data--no-of-seasons', 'textContent'] },
    { Poster: ['title-data--posterURL', 'imageUrlSrc'] },
    { Poster: ['title-data--posterURL-blurred', 'imageUrlSrc'] },
  ];

  // the key is the property key from the parsed title data
  // the first value in the array is the parent element's id
  // the second value is the key of the HTML template inside this class that will be inserted to the parent element
  // the third value indicates whether the strings inside the string[] property will be rendered as a list of text that are separated by dots
  // the fourth value is the class of the child elements where the strings in the data will be binded to
  private static _propArrayOfStringAndParentIdMap: {
    [key: string]: [
      `title-data-container--${string}`,
      `templateSubsection${string}` | `templateSubSubsection${string}`,
      'dot-separated' | 'not',
      `title-data--${string}`
    ];
  }[] = [
    {
      Genre: ['title-data-container--genre', 'templateSubsectionGenre', 'not', 'title-data--genre'],
    },
    {
      Writer: [
        'title-data-container--writer',
        'templateSubsectionWriter',
        'dot-separated',
        'title-data--writer-name',
      ],
    },
    {
      Actors: [
        'title-data-container--actor',
        'templateSubsectionActor',
        'not',
        'title-data--actor-name',
      ],
    },
    {
      Language: [
        'title-data-container--language',
        'templateSubSubsectionLanguage',
        'dot-separated',
        'title-data--language',
      ],
    },
    {
      Country: [
        'title-data-container--country',
        'templateSubSubsectionCountry',
        'dot-separated',
        'title-data--country',
      ],
    },
    {
      Director: [
        'title-data-container--director',
        'templateSubsectionDirector',
        'dot-separated',
        'title-data--director-name',
      ],
    },
  ];

  private static templateTitleDetailsContainer = /*html*/ `<dialog id="title-details__container" class="title-details__container hidden"></dialog>`;

  private static templateTitleDetails = /*html*/ `
  <div id="title-details__backdrop" class="title-details__backdrop hidden"></div>
  <div id="title-details" class="title-details">
  </div>`;

  private static templateSectionsContainer = /*html*/ `
  <div class="title-details__sections-container" id="title-details__sections-container"></div>`;

  // private static templateTitleDetailsBackdrop = /*html*/ `<div id="title-details__backdrop" class="title-details__backdrop hidden"></div>`;

  private static templateHero = /*html*/ `
  <div class="title-details__hero">
    <div class="title-details__title-and-close-btn-container">
      <h2 id="title-data--title" class="title-details__title">Title</h2>
      <button type="button" tabindex="0" name="close-title-details-window" id="title-details__close-btn" class="title-details__close-btn">
        <svg class="x-icon" viewBox="0 0 847 1058.8" xmlns="http://www.w3.org/2000/svg">
          <path d="M423.4,407.4l274.2-274.2c80.9-80.9,202.8,42,121.9,122.9L546.4,529.3l273.2,274.2
  c80.9,80.9-41,202.8-121.9,121.9L423.4,652.2L150.3,925.4c-80.9,80.9-203.8-41-122.9-121.9l274.2-274.2L27.3,256.1
  c-80.9-80.9,42-203.8,122.9-122.9L423.4,407.4z"/>
        </svg>
      </button>
    </div>
    <div id="title-details__metadata-container" class="title-details__metadata-container">
    <!-- metadata info here-->
    </div>
    <div id="title-data-container--genre" class="genre-container">
    </div>
    <div class="hero-bg-blurred-container">
    <img id="title-data--posterURL-blurred" class="hero-bg-blurred" src="https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg"
    
    onerror="this.onerror=null; this.classList.add('title-details__poster--not-available'); this.src='https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg'"
    >
</div>
<div class="title-details__action-buttons-container" id="title-details__action-buttons-container">
<div id="title-details-action--play-trailer" role="button" class="btn-click-animation-and-cursor title-details__play-trailer-btn title-details-action-btn hover--darken active">
<svg id="arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 65 80.81"><path d="M18.43,94.9A8.45,8.45,0,0,1,10,86.46V13.54a8.43,8.43,0,0,1,12.64-7.3L85.79,42.7h0a8.43,8.43,0,0,1,0,14.6L22.64,93.76A8.43,8.43,0,0,1,18.43,94.9Zm0-84.26A3,3,0,0,0,17,11a2.85,2.85,0,0,0-1.44,2.5V86.46A2.89,2.89,0,0,0,19.87,89L83,52.5a2.89,2.89,0,0,0,0-5L19.87,11A2.88,2.88,0,0,0,18.44,10.64Z" transform="translate(-10 -5.1) scale(0.9)"/></svg>
    <p>Play Trailer</p>
</div>
<div id="title-details-action--add-to-list" role="button" class="btn-click-animation-and-cursor button-disabled title-details__add-to-list-btn title-details-action-btn hover--darken">
    <svg id="add_to_list" data-name="add to list" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 97.9 60">
      <path id="add_tos_list" data-name="add tos list" d="M99,76.58a3.25,3.25,0,0,1-3.25,3.25H79.54V96A3.25,3.25,0,0,1,73,96V79.83H56.89a3.25,3.25,0,0,1,0-6.5H73V57.17a3.25,3.25,0,0,1,6.5,0V73.33H95.7A3.24,3.24,0,0,1,99,76.58Zm-57.76,0a3.26,3.26,0,0,0-3.25-3.25H4.3a3.25,3.25,0,1,0,0,6.5H37.94A3.25,3.25,0,0,0,41.19,76.58Zm19-25.28a3.25,3.25,0,0,0-3.25-3.25H4.3a3.25,3.25,0,1,0,0,6.5H56.89A3.26,3.26,0,0,0,60.14,51.3ZM83.55,26a3.26,3.26,0,0,0-3.25-3.25H4.3a3.25,3.25,0,0,0,0,6.5h76A3.25,3.25,0,0,0,83.55,26Z" transform="translate(-1.05 -22.76)"/>
    </svg>
    <p>Add to List</p>
</div>
<div id="title-details-action--comment" role="button" class="btn-click-animation-and-cursor button-disabled title-details__comment-btn title-details-action-btn hover--darken">
  <svg id="comment" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 97.98 98.02">
      <path d="M33.06,99a9.17,9.17,0,0,1-4.39-1.19c-4.87-2.75-5.43-7.25-5.43-10.39V76H10.46A9.46,9.46,0,0,1,1,66.52V10.45A9.46,9.46,0,0,1,10.46,1H89.54A9.46,9.46,0,0,1,99,10.45V66.52A9.46,9.46,0,0,1,89.54,76H60.22C46.41,91.25,37.37,99,33.35,99h-.29ZM10.46,7.66a2.79,2.79,0,0,0-2.79,2.79V66.52a2.79,2.79,0,0,0,2.79,2.79H26.57a3.33,3.33,0,0,1,3.33,3.33V87.43c0,2.9.69,3.82,2.05,4.6a2.79,2.79,0,0,0,1.22.31c2.77-.78,14.18-12,23.09-21.92a3.32,3.32,0,0,1,2.48-1.11h30.8a2.79,2.79,0,0,0,2.79-2.79V10.45a2.79,2.79,0,0,0-2.79-2.79ZM76.78,30.57a3.33,3.33,0,0,0-3.33-3.33H26.56a3.33,3.33,0,1,0,0,6.66H73.45A3.33,3.33,0,0,0,76.78,30.57Zm0,16.43a3.33,3.33,0,0,0-3.33-3.33H26.56a3.33,3.33,0,0,0,0,6.66H73.45A3.33,3.33,0,0,0,76.78,47Z" transform="translate(-1.01 -0.99)"/>
  </svg>
  <p>Comment</p>
</div>
    </div>`;

  private static templateSubsectionMetadataType = /* html */ `
  <p id="title-data--type" class="title-data title-data--title-type text-dot-separated">Type</p>
  `;
  private static templateSubsectionMetadataYear = /* html */ `
  <p id="title-data--year" class="title-data title-data--year text-dot-separated">Year</p>
  `;
  private static templateSubsectionMetadataRated = /* html */ `
  <p id="title-data--rating" class="title-data title-data--rating text-dot-separated">Rating</p>
  `;
  private static templateSubsectionMetadataRuntime = /* html */ `
  <p id="title-data--runtime" class="title-data title-data--runtime text-dot-separated">Runtime</p>
  `;

  private static templateSubsectionPoster = /* html */ `
  <img id="title-data--posterURL" class="title-details__poster" src="https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg" onerror="this.classList.add('title-details__poster--not-available'); this.src='https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg'" alt="">
  `;

  private static templateSubsectionPlot = /* html */ `
  <p id="title-data--plot" class="title-details__plot plot__cutoff-text">Plot</p>
  `;

  private static templateSubsectionGenre = /*html*/ `
    <div class="genre"><p class="title-data--genre">Genre</p></div>`;

  private static templateSectionRatings = /*html*/ `
    <div id="title-details__section-container" class="title-details__section-container title-details__section--ratings">
        <h3 class="title-details__section-title">Ratings</h3>
        <div id="title-details__ratings-container" class="title-details__ratings-container">
        </div>
    </div>`;

  private static templateSubsectionRatingImdb = /*html*/ `
      <div class="title-details__rating-container title-details__rating--imdb">
          ${SvgStrings.imdb}
          <p class="title-details__rating__rating imdb-score"><span id="title-data--imdb-score" class="medium">Imdb Score</span></p>
      </div>
  `;

  public static rtSvgStringSelector(rating: 'fresh' | 'certified-fresh' | 'rotten'): string {
    switch (rating) {
      case 'fresh':
        return SvgStrings.rtFresh;
      case 'certified-fresh':
        return SvgStrings.rtCertifiedFresh;
      case 'rotten':
        return SvgStrings.rtRotten;
      default:
        return SvgStrings.rtFresh;
    }
  }
  private static templateSubsectionRatingRT = /*html*/ `
        <div id="title-details__rating--rotten-tomatoes" class="title-details__rating-container title-details__rating--rotten-tomatoes">
        <!-- place for icon -->
          <p class="title-details__rating__rating rt-score"><span id="title-data--rt-score" class="medium">RT Score</span>%</p>
        </div>`;
  private static templateSubsectionRatingMetacritic = /*html*/ `
      <div class="title-details__rating-container title-details__rating--metacritic">
          ${SvgStrings.metacritic}
          <p class="title-details__rating__rating metacritic-score"><span id="title-data--metacritic-score" class="medium metacritic-score">MT Score</span></p>
      </div>`;

  private static templateSectionSeasons = /*html*/ `
            <div class="title-details__section-container title-details__section--seasons">
              <div class="seasons-title-and-more-seasons-button-container">
                <h3 class="title-details__section-title">Seasons</h3>
                <div class="more-seasons-button">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 13 7.44">
                    <path d="M6.44,7.44a1,1,0,0,1-.71-.29L.29,1.71A1,1,0,0,1,1.71.29L6.45,5,11.3.29a1,1,0,1,1,1.4,1.42L7.14,7.16A1,1,0,0,1,6.44,7.44Z"/>
                  </svg>
                </div>
              </div>
              <p><span id="title-data--no-of-seasons">8</span><span class="season-or-seasons"> Season/s</span></p>
            </div>`;

  private static templateSectionCast = /*html*/ `
    <div class="title-details__section-container title-details__section--top-cast">
      <h3 class="title-details__section-title">Top Cast</h3>
      <div id="title-data-container--actor" class="title-details__cast-container">
      </div>
    </div>`;

  private static templateSubsectionActor = /*html*/ `
    <div class="title-details__actor-container">
      ${SvgStrings.actorPhotoPlaceholder}
      <p class="title-details__actor-name title-data--actor-name">Actor Name</p>
    </div>`;

  private static templateSectionDirectors = /*html*/ `
      <div class="title-details__section-container title-details__section--directors">
          <h3 class="title-details__section-title"><span class="director-or-directors">Director</span></h3>
          <div id="title-data-container--director" class="title-details__section--directors-container title-details__section-container--dot-separated">
          </div>
      </div>`;
  private static templateSubsectionDirector = /*html*/ `
  <p class="title_details__director text-dot-separated title-data--director-name">Director</p>`;

  private static templateSectionWriters = /*html*/ `
        <div class="title-details__section-container title-details__section--writers">
            <h3 class="title-details__section-title">Writers</h3>
            <div id="title-data-container--writer" class="title-details__section--writers-container title-details__section-container--dot-separated">
            </div>
        </div>`;

  private static templateSubsectionWriter = /*html*/ `
      <p class="title_details__writer text-dot-separated title-data--writer-name" >Writer</p>`;

  private static templateSectionAwards = /*html*/ `
      <div class="title-details__section-container title-details__section--awards">
        <h3 class="title-details__section-title">Awards</h3>
        <p id="title-data--awards" class="title-details__awards">awards list</p>
      </div>`;

  private static templateSectionOtherInfo = /*html*/ `
    <div 
    id="title-details-joined-section-container"
    class="title-details-joined-section-container title-details__section--other-info-group">
    </div>`;

  private static templateSubsectionLanguage = /*html*/ `
    <div class="title-details__section-container title-details__section--language title-details__subsection-container">
        <h3 class="title-details__section-title"><span class="language-or-languages">Language</span></h3>
        <div id="title-data-container--language" class="title-details__section--language-container title-details__section-container--dot-separated">
        </div>
    </div>`;
  private static templateSubSubsectionLanguage = /*html*/ `
  <p class="title_details__language text-dot-separated title-data--language">language</p>`;

  private static templateSubsectionCountry = /*html*/ `
    <div class="title-details__section-container title-details__section--country title-details__subsection-container">
      <h3 class="title-details__section-title">
      <span class="country-or-countries">Country</span> of Origin</h3>
      <div
      id="title-data-container--country"
      class="title-details__section--country title-details__section-container--dot-separated">
      </div>
    </div>`;

  private static templateSubSubsectionCountry = /*html*/ `<p class="title_details__country text-dot-separated title-data--country">country</p>`;

  private static templateSubsectionReleaseDate = /*html*/ `
    <div class="title-details__section-container title-details__release-date title-details__subsection-container">
      <h3 class="title-details__section-title">Release Date</h3>
      <p id="title-data--release-date" class="title_details__release-date">release-date</p>
    </div>`;

  private static templateSubsectionDVD = /*html*/ `
    <div class="title-details__section-container title-details__dvd title-details__subsection-container">
      <h3 class="title-details__section-title">DVD</h3>
      <p id="title-data--dvd" class="title_details__dvd">dvd-date</p>
    </div>`;

  private static templateSubsectionBoxOffice = /*html*/ `
      <div class="title-details__section-container title-details__box-office title-details__subsection-container">
        <h3 class="title-details__section-title">Box Office</h3>
        <p id="title-data--box-office" class="title_details__box-office">$000,000,000</p>
      </div>`;

  static templateDotSeparatorMetadata = /*html*/ `<p class="dot-separator metadata">•</p>`;
  private static templateDotSeparatorTextItem = /*html*/ `<p class="dot-separator sections">•</p>`;
}

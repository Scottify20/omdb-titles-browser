import { GeneralResultParsedTypes } from '../../omdb/OmdbGeneralSearch';

export class ViewGeneralResults {
  constructor(public parentElement: Element, public generalResult: GeneralResultParsedTypes) {}

  static renderResults(parentElement: Element, result: GeneralResultParsedTypes) {
    return new ViewGeneralResults(parentElement, result).processRender();
  }

  processRender(): void {
    if (this.generalResult?.pageNumber) {
      const parent = this.parentElement;
      const page = this.generalResult?.pageNumber as number;

      if (page <= 1) {
        parent.innerHTML = '';
      }
      parent.append(this.bindResults().content);
    }
  }

  bindResults(): HTMLTemplateElement {
    const result = this.generalResult;

    let templateElement = document.createElement('template');
    if (result) {
      // No more results
      // No results found
      if (result.Error === 'No more results found!') {
        templateElement.innerHTML = this.templateLastPageWarning;
      } else if (result.Error === 'Movie not found!') {
        templateElement.innerHTML = this.templateNoResults;
      }
      // If too many results found
      else if (result.Error === 'Too many results.') {
        templateElement.innerHTML = this.templateTooManyResultsError;
      }
      // If results found
      else if (result.Search && result.Search[0] != undefined) {
        templateElement = this.bindTemplateCardResultsSuccess(templateElement);
      }
      // If there are other errors sent by Omdb API //Fallback
      else if (result.Error !== 'No Error') {
        templateElement.innerHTML = this.templateFallbacktoServerMessageError;
      }
    } else {
      // if this.generalResult is undefined (fetch error)
      templateElement.innerHTML = this.templateFetchCodeError;
      console.log('Fetch code Error');
    }
    return templateElement;
  }

  yearArraytoString(yearArray: number[]): string {
    let yearString = yearArray.join(' - ');
    return yearString;
  }

  bindTemplateCardResultsSuccess(templateElement: HTMLTemplateElement): HTMLTemplateElement {
    const cardTemplateElement = templateElement;

    this.generalResult?.Search?.forEach((film) => {
      const cardTemplate = document.createElement('template');
      cardTemplate.innerHTML = this.templateCardResultsSuccess;

      const filmCardParent = cardTemplate.content.querySelector('article.card');
      const filmTitle = cardTemplate.content.querySelector('.card__title-text');
      const filmYear = cardTemplate.content.querySelector('.card__tag-year-text');
      const filmType = cardTemplate.content.querySelector('.card__tag-media-type-text');
      const filmPoster = cardTemplate.content.querySelector('.card__thumb');
      const openImdbBtn = cardTemplate.content.querySelector('.visit-imdb-btn');
      const linksMenuCBToggle = cardTemplate.content.querySelector('.toggle-links-for-no-hover');

      if (filmCardParent && filmTitle && filmYear && filmType) {
        filmCardParent.setAttribute('id', `card-${film.imdbID}`);
        filmTitle.textContent = film.Title;
        filmYear.textContent = this.yearArraytoString(film.Year);
        filmType.textContent = film.Type;
      }

      if (film.Poster) {
        filmPoster?.setAttribute(
          'onerror',
          `this.onerror=null; this.src='https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg'`
        );
        filmPoster?.setAttribute('src', film.Poster);
      }

      openImdbBtn?.setAttribute(
        'onclick',
        `window.open(
          'https://imdb.com/title/${film.imdbID}/',
          '_blank'
          );`
      );

      if (linksMenuCBToggle) {
        linksMenuCBToggle.setAttribute('id', `cb-menu-toggle-${film.imdbID}`);
      }

      cardTemplateElement.content.append(cardTemplate.content);
    });
    return cardTemplateElement;
  }

  templateLastPageWarning: string = `
  <div class="no-more-results search-error-container error-fetching-general-results">
  <h2 class="search-error-title">That's all for:</h2>
  <p class="search-error-desc"> ${this.generalResult?.searchQuery}<p>
  </div>
  `;

  templateFallbacktoServerMessageError: string = `
  <div class="search-error-container error-fetching-general-results">
  <h2 class="search-error-title">Failed to fetch data</h2>
  <p class="search-error-desc"> ${this.generalResult!.Error}<p>
  </div>`;

  templateTooManyResultsError: string = `
  <div class="search-error-container error-too-many-results">
  <h2 class="search-error-title">Too many results.</h2>
  <p class="search-error-desc">Please be more specific.<p>
  </div>`;

  templateFetchCodeError: string = `
  <div class="search-error-container error-fetch-code-error">
  <h2 class="search-error-title">A Fetch API error has occurred.</h2>
  <p class="search-error-desc">Please notify: 'Scottify20'about this error.</p>
  </div>`;

  templateNoResults: string = `
  <div class="search-error-container error-no-results">
  <h2 class="search-error-title">No results found for:</h2>
  <p class="search-error-desc">${this.generalResult?.searchQuery}</p>
  </div>`;

  templateCardResultsSuccess: string = `
  <article class="card search-result-card" tabindex="0">
  <div class="card__thumb-and-links-container cursor--pointer">
    <input
      type="checkbox"
      name="card-links-toggle"
      class="toggle-links-for-no-hover"
    />
    <div class="card__link-buttons-container">
      <button id="" class="view-details-btn cursor--pointer">
        View Details
      </button>
      <button id="" class="visit-imdb-btn cursor--pointer">
        View in
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/6/69/IMDB_Logo_2016.svg"
          alt="imdb-logo"
          class="imdb-logo"
          height="20px"
        />
      </button>
    </div>
    <img
      alt="movie thumbnail"
      class="card__thumb"
      width="100px"
    />
  </div>

  <div class="card__details-container">
    <h2 class="card__title">
      <span
        class="card__title-text medium-text cursor--pointer hover--underline"
        >Film Title</span
      >
    </h2>

    <div class="card__tags-container">
      <div class="card__tag-year card__tag">
        <p class="card__tag-text card__tag-year-text">Year</p>
      </div>
      <div class="card__tag-media-type card__tag">
        <p class="card__tag-text card__tag-media-type-text">Type</p>
      </div>
    </div>
  </div>
</article>`;
}
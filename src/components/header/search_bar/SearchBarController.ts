import {
  GeneralResultParsedTypes,
  GeneralTitleSearch,
  OmdbSearchTitleTypes,
} from '../../../utils/omdb/OmdbGeneralSearch';

import { ResultCardsRenderer } from '../../result_card_container/ResultCardsRenderer';

export class SearchBarController {
  constructor(isOn: boolean) {
    if (isOn) {
      SearchBarController.startSearchBar();
    }
  }
  private static cardGroupElement = document.getElementById('card-group') as Element;

  private static startSearchBar() {
    const searchBarFormContainer = document.querySelector(
      '.nav__search-bar-container'
    ) as HTMLFormElement;

    const searchBar = document.querySelector('#nav-search-bar') as HTMLInputElement;

    searchBarFormContainer.addEventListener('submit', (event) => {
      event.preventDefault();
      if (searchBar.value === GeneralTitleSearch.titleName) {
        return;
      }

      GeneralTitleSearch.isNoMorePages = false;
      if (searchBar.value.length >= 3) {
        GeneralTitleSearch.titleName = searchBar.value;
        this.searchAndRender();
      } else {
        console.log('Search query must be at least 3 characters');
      }
    });
  }

  public static async searchAndRender() {
    if (GeneralTitleSearch.isNoMorePages) {
      FooterObserver.unobserve();
      const noMorePagesResult: GeneralResultParsedTypes = {
        Response: 'True',
        Error: 'No more results found!',
        pageNumber: 10000,
        searchQuery: GeneralTitleSearch.titleName,
      };
      ResultCardsRenderer.renderResults(this.cardGroupElement, noMorePagesResult);
      return;
    }

    if (!GeneralTitleSearch.isRepeatedTitleQuery) {
      GeneralTitleSearch.page = 1;
      this.cardGroupElement.innerHTML = '';
    }

    LoadingAnimation.show();
    const searchResult = await GeneralTitleSearch.search();
    ResultCardsRenderer.renderResults(this.cardGroupElement, searchResult);
    FooterObserver.observe();
    LoadingAnimation.hide();
  }

  static seeMoreResults() {
    if (GeneralTitleSearch.isMaxPageReached) {
      console.log('max page reached');
      FooterObserver.unobserve();
      return;
    }
    GeneralTitleSearch.page += 1;
    this.searchAndRender();
  }
}

// Footer Observer // semi-Infinite scrolling
class FooterObserver {
  private static footerElement = document.querySelector('#footer') as Element;

  static footerObserver = new IntersectionObserver(
    (entries) => {
      const footerEntry = entries[0];
      if (footerEntry.isIntersecting && GeneralTitleSearch.resultCopy?.Error === 'No Error') {
        // console.log('intersecting');
        this.footerObserver.unobserve(this.footerElement);
        SearchBarController.seeMoreResults();
      } else {
        // console.log('not intersecting');
      }
    },
    { rootMargin: '1000px' }
  );

  public static observe() {
    this.footerObserver.observe(this.footerElement);
  }
  public static unobserve() {
    this.footerObserver.unobserve(this.footerElement);
  }
}

// Searchbar Filtering
class SearchFilter {
  public static setPage(pageNumber: number) {
    GeneralTitleSearch.page = pageNumber;
  }
  public static setType(type: OmdbSearchTitleTypes) {
    GeneralTitleSearch.type = type;
  }
  public static setYear(year: string) {
    GeneralTitleSearch.year = year;
  }
}

// Loading Animation
class LoadingAnimation {
  private static loader = document.querySelector('div#loading');

  public static show() {
    this.loader?.classList.add('visible');
  }
  public static hide() {
    this.loader?.classList.remove('visible');
  }
}

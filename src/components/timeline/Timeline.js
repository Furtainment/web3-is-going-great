import { Fragment, useCallback, useState, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import clsx from "clsx";

import useWindowWidth from "../../hooks/useWindowWidth";
import useIsBrowserRendering from "../../hooks/useIsBrowserRendering";

import { FiltersPropType } from "../../constants/filters";

import Link from "next/link";
import { InView, useInView } from "react-intersection-observer";
import CustomEntryHead from "../CustomEntryHead";
import Header from "./Header";
import Filters from "./Filters";
import Entry from "./Entry";
import FixedAtBottom from "./FixedAtBottom";
import Loader from "../Loader";
import Error from "../Error";

export default function Timeline({
  queryResult,
  filters,
  glossary,
  griftTotal,
  selectedEntryFromSearch,
  startAtId,
  setFilters,
  setSelectedEntryFromSearch,
}) {
  const isBrowserRendering = useIsBrowserRendering();
  const windowWidth = useWindowWidth();

  const [currentRunningScamTotal, setCurrentRunningScamTotal] = useState(0);

  const [headerInViewRef, headerInView] = useInView();
  const headerFocusRef = useRef();

  const scrollToTop = useCallback(() => {
    window.scrollTo(0, 0);
    headerFocusRef.current.focus();
  }, [headerFocusRef]);

  const {
    data,
    hasNextPage,
    fetchNextPage,
    isFetching,
    isLoading,
    isError,
    isSuccess,
  } = queryResult;

  const hasPreviousEntries = useMemo(
    () =>
      isSuccess &&
      data &&
      data.pages &&
      data.pages.length &&
      data.pages[0] &&
      data.pages[0].hasPrev,
    [data, isSuccess]
  );

  const shouldRenderGoToTop = useMemo(
    () => (!!startAtId && hasPreviousEntries) || !!selectedEntryFromSearch,
    [startAtId, hasPreviousEntries, selectedEntryFromSearch]
  );

  const renderScrollSentinel = () => {
    return (
      <InView
        threshold={0}
        onChange={(inView) => {
          if (inView && !isFetching) {
            fetchNextPage();
          }
        }}
      >
        <div className="scroll-sentinel"></div>
      </InView>
    );
  };

  const renderGoToTop = () => {
    return (
      <>
        <div className="load-top">
          <button
            onClick={() => (window.location.href = window.location.origin)}
          >
            <span>Start from the top</span>
          </button>
        </div>
        <div className="timeline dots" />
      </>
    );
  };

  const renderEntries = () => {
    let runningScamTotal = 0;
    return (
      <>
        {shouldRenderGoToTop && renderGoToTop()}
        {startAtId && <CustomEntryHead entry={data.pages[0].entries[0]} />}
        <article
          id="timeline"
          className={clsx("timeline", {
            "small-top-margin": shouldRenderGoToTop,
          })}
        >
          {data.pages.map((page, pageInd) => {
            const isLastPage = pageInd === data.pages.length - 1;
            return (
              <Fragment key={`page-${pageInd}`}>
                {page.entries.map((entry, entryInd) => {
                  const isLastEntry = entryInd === page.entries.length - 1;
                  let className = entryInd % 2 === 0 ? "even" : "odd";
                  if (pageInd === 0 && entryInd === 0) {
                    className += " first";
                  }
                  if (entry.scamTotal) {
                    runningScamTotal += entry.scamTotal;
                  }

                  const entryElement = (
                    <Entry
                      key={entry.id}
                      entry={entry}
                      className={className}
                      windowWidth={windowWidth}
                      runningScamTotal={runningScamTotal}
                      currentRunningScamTotal={currentRunningScamTotal}
                      setCurrentRunningScamTotal={setCurrentRunningScamTotal}
                      shouldScrollToElement={entry.id === startAtId}
                      glossary={glossary}
                    />
                  );

                  // Render the scroll sentinel above the last entry in the last page of results so we can begin loading
                  // the next page when it comes into view.
                  if (isLastPage && isLastEntry) {
                    return (
                      <Fragment key={`${entry.id}-withSentinel`}>
                        {renderScrollSentinel()}
                        {entryElement}
                      </Fragment>
                    );
                  }
                  return entryElement;
                })}
              </Fragment>
            );
          })}
          {hasNextPage && <Loader />}
        </article>
      </>
    );
  };

  const renderBody = () => {
    if (isLoading) {
      return <Loader />;
    } else if (isError) {
      return <Error />;
    }
    return renderEntries();
  };

  const renderNoJs = () => {
    if (!isBrowserRendering) {
      return (
        <p id="noscript">
          No JavaScript? That's cool too! Check out the{" "}
          <Link href="/web1">
            <a>Web&nbsp;1.0</a>
          </Link>{" "}
          version of this site.
        </p>
      );
    }
    return null;
  };

  return (
    <>
      <Header
        windowWidth={windowWidth}
        ref={{ focusRef: headerFocusRef, inViewRef: headerInViewRef }}
      />
      {isBrowserRendering && (!startAtId || !hasPreviousEntries) && (
        <Filters
          filters={filters}
          setFilters={setFilters}
          setSelectedEntryFromSearch={setSelectedEntryFromSearch}
          windowWidth={windowWidth}
        />
      )}
      <div
        className="timeline-page content-wrapper"
        aria-busy={isLoading}
        aria-live="polite"
      >
        {renderNoJs()}
        <div style={{ display: isBrowserRendering ? "initial" : "none" }}>
          {renderBody()}
        </div>
      </div>
      <FixedAtBottom
        headerInView={headerInView}
        shouldRenderGriftCounter={!startAtId || !hasPreviousEntries}
        scrollToTop={scrollToTop}
        runningGriftTotal={currentRunningScamTotal}
        griftTotal={griftTotal}
      />
    </>
  );
}

Timeline.propTypes = {
  queryResult: PropTypes.shape({
    data: PropTypes.object.isRequired,
    hasNextPage: PropTypes.bool.isRequired,
    fetchNextPage: PropTypes.func.isRequired,
    isFetching: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool.isRequired,
    isError: PropTypes.bool.isRequired,
    isSuccess: PropTypes.bool.isRequired,
  }),
  filters: FiltersPropType.isRequired,
  glossary: PropTypes.object.isRequired,
  griftTotal: PropTypes.number.isRequired,
  selectedEntryFromSearch: PropTypes.string,
  startAtId: PropTypes.string,
  setFilters: PropTypes.func.isRequired,
  setSelectedEntryFromSearch: PropTypes.func.isRequired,
};
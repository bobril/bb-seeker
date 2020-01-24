using NUnit.Framework;
using System;
using OpenQA.Selenium;

namespace BBSeeker.Tests
{
    [Category("BBSeeker")]
    [TestFixture]
    [Parallelizable(ParallelScope.Children)]
    public class BBSeekerTests : TestBase
    {


        [SetUp]
        public void TestSetUp()
        {
            var htmlSamplePath = WebDriverExtensionsCustom.RootPath + @"\BBSeekerSamples\FirstPage.html";
            Driver.Navigate().GoToUrl(new Uri(htmlSamplePath).AbsoluteUri);
        }

        [Test]
        public void FindElementSuccess()
        {
            var element = Driver.FindElement("span[text=First Page]");

            Assert.AreEqual("First Page", element.Text, "'First Page' span found");
        }

        [Test]
        public void FindElementsSuccess()
        {
            var elements = Driver.FindElements(".BasicTableComponent");

            Assert.AreEqual(elements.Count, 2, "Two tables on the page.");
        }

        [Test]
        public void FindElementsNotFound()
        {
            var elements = Driver.FindElements("tr.TableRowComponentssss");

            Assert.AreEqual(0, elements.Count, "Should be an empty collection");
        }

        [Test]
        public void FindElementTooManyReturnedButOneExpectedThrowsApplicationError()
        {
            var ex = Assert.Throws<ApplicationException>(() => Driver.FindElement("tr.TableRowComponent"));
            Assert.That(ex.Message, Does.Contain("Too many results returned for expression"));
        }

        [Test]
        public void FindElementNotFoundReturnsNull()
        {
            var element = Driver.FindElement("div.BaseComponentsss");

            Assert.AreEqual(null, element, "FindElement returns null for not found");
        }

        [Test]
        public void FindElementWithTimeoutSuccess()
        {
            Driver.FindElement("div[text=Second Page]").Click();
            WithTimeMeasurement(() =>
            {
                return Driver.FindElementWithTimeout("span[text=Page 2]", 2);
            }, (element, elapsedTime) =>
            {
                Assert.AreEqual("Page 2", element.Text);
                Assert.Less(elapsedTime, 2 * 1000, "Time to return should be shorter than 2s timeout");
            });
        }

        [Test, NonParallelizable]
        public void FindElementWithTimeoutThrowsTimeoutException()
        {
            Driver.FindElement("div[text=Second Page]").Click();

            WithTimeMeasurement(() =>
            {
                return Assert.Throws<TimeoutException>(() => Driver.FindElementWithTimeout("span[text=Page 2 ssss]", 2));
            }, (ex, elapsedTime) =>
            {
                Assert.That(ex.Message, Does.Contain("Async search timed out after"));
                Assert.GreaterOrEqual(elapsedTime, WaitTime * 1000, "Time to return should be equal or greater than 2s timeout");
                Assert.Less(elapsedTime, 3 * 1000, "Time to return should be shorter than 3 seconds");
            });
        }

        [Test, NonParallelizable]
        public void FindElementWithTimeoutError()
        {
            Driver.FindElement("div[text=Second Page]").Click();

            WithTimeMeasurement(() =>
            {
                return Assert.Throws<ApplicationException>(() => Driver.FindElementWithTimeout("span[Page 2 ssss]", 2));
            }, (ex, elapsedTime) =>
            {
                Assert.That(ex.Message, Does.Contain("BBSeekerError(PARSER): Unrecognized filter: 'Page 2 ssss'"));
                Assert.Less(elapsedTime, WaitTime * 1000, "Time to return should be smaller than 2s timeout");
            });
        }

        [Test]
        public void WaitForElementNotPresentSuccess()
        {
            WithTimeMeasurement(() =>
            {
                IJavaScriptExecutor jsExecutor = Driver as IJavaScriptExecutor;
                jsExecutor.ExecuteScript("setTimeout(function () { BBSeeker.findElements('.CheckboxWithLabelComponent')[0].click(); }, 1000);");
                Driver.WaitUntilElementIsNotPresent("div[text=Checkbox is: true]", 2);
                return true;
            }, (waitFinished, elapsedTime) =>
            {
                Assert.That(elapsedTime, Is.LessThan(2000));
                Assert.IsNull(Driver.FindElement("div[text=Checkbox is: true]"));
                Assert.IsNotNull(Driver.FindElement("div[text=Checkbox is: false]"));
            });
        }

        [Test]
        public void WaitForElementNotPresentTimeout()
        {
            WithTimeMeasurement(() =>
            {
                return Assert.Throws<TimeoutException>(() => Driver.WaitUntilElementIsNotPresent("span[text=First Page]", 2));
            }, (ex, elapsedTime) =>
            {
                Assert.That(elapsedTime, Is.AtLeast(2000));
                Assert.That(ex.Message, Does.Contain("Timed out waiting for element to be removed:"));
                Assert.NotNull(Driver.FindElement("span[text=First Page]"));
            });
        }

        [Test]
        public void WaitForElementNotPresentError()
        {
            WithTimeMeasurement(() =>
            {
                return Assert.Throws<ApplicationException>(() => Driver.WaitUntilElementIsNotPresent("span[invalidFilter]", 2));
            }, (ex, elapsedTime) =>
            {
                Assert.That(ex.Message, Does.Contain("BBSeekerError(PARSER): Unrecognized filter: 'invalidFilter'"));
            });
        }

        [Test]
        public void MaskSelector()
        {
            var elementNested = Driver.FindElement("div/*[text=First Page]");
            var elementSubstitute = Driver.FindElement("*.CheckboxWithLabelComponent");

            Assert.AreEqual("First Page", elementNested.Text, "Mask works in a path.");
            Assert.AreEqual("Test", elementSubstitute.Text, "Mask works as tag substitute.");
        }

        [Test]
        public void IndirectChildSelector()
        {
            var childById = Driver.FindElement(".BaseComponent/~.ImageComponent");
            var childByTag = Driver.FindElement(".BaseComponent/~input");

            Assert.AreEqual("Stars", childById.GetAttribute("alt"), "Indirect child by ID found.");
            Assert.AreEqual("checkbox", childByTag.GetAttribute("type"), "Indirect child by tag found.");
        }

        [Test]
        public void ParentSelector()
        {
            var parent = Driver.FindElement(".TableCellSortAndFilterComponent/^/^");

            Assert.AreEqual("IndexN", parent.GetAttribute("textContent"), "THEAD Parent of a parent found.");
        }

        [Test]
        public void ParentSelectorWithFiltering()
        {
            var result1 = Driver.GetDataWithTimeout("table[0]/^div[$separatorColor=transparent]", "separatorHeight");
            var result2 = Driver.GetAttributeWithTimeout(".TableCellSortAndFilterComponent/^#1_", "textContent");

            Assert.AreEqual("0em", result1, "Correct parent div was found using parent selector");
            Assert.AreEqual(
                "IndexN1N1 Text2N2 Text3N3 Text4N4 Text5N5 Text6N6 Text7N7 Text8N8 Text9N9 Text10N10 TextSecond PageFile InputEnd", 
                result2, "Correct parent div and key was found using parent selector");
        }

        [Test]
        public void IndexFilter()
        {
            var indexFilter = Driver.FindElement("tbody[0]/tr[9]/td[1]");

            Assert.AreEqual("N10 Text", indexFilter.Text, "Index filter returns cell with 'N10 Text'.");
        }

        [Test]
        public void TextFilter()
        {
            var strictTextFilter = Driver.FindElement("span[text=First Page]");
            var containsTextFilter = Driver.FindElement("span[text~rst P]");

            Assert.AreEqual("First Page", strictTextFilter.Text, "Strict text filter works.");
            Assert.AreEqual("First Page", containsTextFilter.Text, "Contains text filter works.");
        }

        [Test]
        public void StrictAttributeFilter()
        {
            var imgByAltAttr = Driver.FindElement("img[@alt=Stars]");

            Assert.AreEqual("IMG", imgByAltAttr.GetAttribute("tagName"), "Strict attribute filter works.");
        }

        [Test]
        public void NonStrictAttributeFilter()
        {
            var starsImage = Driver.FindElement(".ImageComponent[@alt~ars]");

            Assert.AreEqual("Stars", starsImage.GetAttribute("alt"), "Non-strict attribute filter works.");
        }

        [Test]
        public void StrictDataFilter()
        {
            var chartByDataSize = Driver.FindElement("div[$chartSize=20em]");

            Assert.AreEqual("0", chartByDataSize.GetAttribute("data-highcharts-chart"), "Strict data filter works.");
        }

        [Test]
        public void NonStrictDataFilter()
        {
            var starsImage = Driver.FindElement(".ImageComponent[$alternateText~ars]");

            Assert.AreEqual("Stars", starsImage.GetAttribute("alt"), "Non-strict data filter works.");
        }

        [Test]
        public void MultipleFiltersWithAnd()
        {
            var cellN9 = Driver.FindElement("tr/~span[text~9]AND[text~N]");

            Assert.AreEqual("N9 Text", cellN9.Text, "Multiple filters using AND works.");
        }

        [Test]
        public void SeparatorCharactersInFiltersAreIgnored()
        {
            var matchedText = "Text with / BBSeeker separator = characters.";
            var element = Driver.FindElement("div[@innerText=" + matchedText + "]");

            Assert.AreEqual(matchedText, element.Text, "Separators characters in filters are skipped");
        }

        [Test]
        public void LevelSeparatorInIdCanBeReplacedWithHyphen()
        {
            var element = Driver.FindElement(".-IdWithSlashComponent");

            Assert.IsNotNull(element, "'/' can be replaced with '-' in search expression");
        }

        [Test]
        public void IndexFilterWithLast()
        {
            var cell10Basic = Driver.FindElement("tbody[0]/tr[last()]/td[0]");
            var cell09IndexAndSpaces = Driver.FindElement("tbody[0]/tr[last() -  1]/td[0]");
            var cell09Index = Driver.FindElement("tbody[0]/tr[last()-1]/td[0]");

            Assert.AreEqual("10", cell10Basic.Text, "Should return 10th row cell");
            Assert.AreEqual("9", cell09IndexAndSpaces.Text, "Should return 9th row cell");
            Assert.AreEqual("9", cell09Index.Text, "Should return 9th row cell");
        }

        [Test]
        public void IndexFilterWithLastError()
        {
            var ex = Assert.Throws<WebDriverException>(() => Driver.FindElement("tbody[0]/tr[last() - 10]"));

            Assert.That(ex.Message, Does.Contain("BBSeekerError(SEARCH): Index filter: 'last()-10' is outside of result set length: '10'"));
        }

        [Test]
        public void VirtualComponentsError()
        {
            var ex = Assert.Throws<WebDriverException>(() => Driver.FindElement("div[text~Text with]"));

            Assert.That(ex.Message, Does.Contain("BBSeekerError(SEARCH): Virtual components present in the result set. Please revise and fix your search expression to target a non-virtual component."));
        }

        [Test]
        public void GetAttributeListSuccess()
        {
            var attributeValues = Driver.GetAttributeList(".CheckboxWithLabelComponent/input", "value");

            Assert.AreEqual("on", attributeValues[0], "getAttributeList works");
        }

        [Test]
        public void GetDataListSuccess()
        {
            var dataValues = Driver.GetDataList(".ImageComponent", "alternateText");

            Assert.AreEqual("Stars", dataValues[0], "getDataList works");
        }

        [Test]
        public void GetProperyListSuccess()
        {
            var propertyValues = Driver.GetPropertyList(".BasicTableComponent[1]/~.TableRowComponent", "children[0].element.textContent");

            Assert.AreEqual(4, propertyValues.Count, "getPropertyList works");
            Assert.AreEqual("A", propertyValues[0]);
            Assert.AreEqual("Text A1", propertyValues[1]);
            Assert.AreEqual("Text A2", propertyValues[2]);
            Assert.AreEqual("A Footer", propertyValues[3]);
        }

        [Test]
        public void GetDataListNoDataMatchReturnsNull()
        {
            var dataValues = Driver.GetDataList("table[1]/~tr", "xyz");

            Assert.AreEqual(null, dataValues[0], "getDataList returns undefined if data property is not found");
            Assert.AreEqual(null, dataValues[1]);
            Assert.AreEqual(null, dataValues[2]);
            Assert.AreEqual(null, dataValues[3]);
        }

        [Test]
        public void GetPropertyListNoDataMatchReturnsNull()
        {
            var dataValues = Driver.GetPropertyList("table[1]/~tr", "xyz");

            Assert.AreEqual(null, dataValues[0], "getDataList returns undefined if data property is not found");
            Assert.AreEqual(null, dataValues[1]);
            Assert.AreEqual(null, dataValues[2]);
            Assert.AreEqual(null, dataValues[3]);
        }

        [Test]
        public void GetAttributeListNoAttrMatchReturnsNull()
        {
            var attrValues = Driver.GetAttributeList("table[1]/~tr", "xyz");

            Assert.AreEqual(null, attrValues[0], "getAttributeList returns undefined if data property is not found");
            Assert.AreEqual(null, attrValues[1]);
            Assert.AreEqual(null, attrValues[2]);
            Assert.AreEqual(null, attrValues[3]);
        }

        [Test]
        public void GetDataNoDataMatchReturnsNull()
        {
            var dataValue = Driver.GetData(".CheckboxWithLabelComponent", "xyz");

            Assert.AreEqual(null, dataValue, "getData returns undefined if data property is not found");
        }


        [Test]
        public void GetPropertyNoDataMatchReturnsNull()
        {
            var dataValue = Driver.GetProperty(".CheckboxWithLabelComponent", "xyz");

            Assert.AreEqual(null, dataValue, "getProperty returns undefined if data property is not found");
        }


        [Test]
        public void GetAttributeNoAttrMatchReturnsNull()
        {
            var attrValue = Driver.GetAttribute(".CheckboxWithLabelComponent", "xyz");

            Assert.AreEqual(null, attrValue, "getAttribute returns undefined if data property is not found");
        }

        [Test]
        public void GetAttributeListAsyncSuccess()
        {
            WithTimeMeasurement(() =>
            {
                return Driver.GetAttributeListWithTimeout(".CheckboxWithLabelComponent/input", "value", 2);
            }, (attributeValues, elapsedTime) =>
            {
                Assert.AreEqual("on", attributeValues[0], "getAttributeList works");
                Assert.Less(elapsedTime, 2 * 1000, "Time to return should be shorter than 2s timeout");
            });
        }

        [Test, NonParallelizable]
        public void GetAttributeListAsyncError()
        {
            Driver.FindElement("div[text=Second Page]").Click();

            WithTimeMeasurement(() =>
            {
                return Assert.Throws<ApplicationException>(() => Driver.GetAttributeListWithTimeout(".BaseComponent[ssss]", "aaaa", 2));
            }, (ex, elapsedTime) =>
            {
                Assert.That(ex.Message, Does.Contain("BBSeekerError(PARSER): Unrecognized filter: 'ssss'"));
                Assert.Less(elapsedTime, WaitTime * 1000, "Time to return should be smaller than 2s timeout");
            });
        }

        [Test]
        public void GetAttributeListAsyncThrowsTimeoutException()
        {
            Driver.FindElement("div[text=Second Page]").Click();

            WithTimeMeasurement(() =>
            {
                return Assert.Throws<TimeoutException>(() => Driver.GetAttributeListWithTimeout("span[text=Page 2 ssss]", "xyz", 2));
            }, (ex, elapsedTime) =>
            {
                Assert.That(ex.Message, Does.Contain("Async search timed out after"));
                Assert.GreaterOrEqual(elapsedTime, WaitTime * 1000, "Time to return should be equal or greater than 2s timeout");
                Assert.Less(elapsedTime, 3 * 1000, "Time to return should be shorter than 3 seconds");
            });
        }

        [Test]
        public void GetDataListAsyncSuccess()
        {
            WithTimeMeasurement(() =>
            {
                return Driver.GetDataListWithTimeout(".ImageComponent", "alternateText", 2);
            }, (dataValues, elapsedTime) =>
            {
                Assert.AreEqual("Stars", dataValues[0], "getDataList works");
                Assert.Less(elapsedTime, 2 * 1000, "Time to return should be shorter than 2s timeout");
            });
        }

        [Test]
        public void GetDataListAsyncError()
        {
            Driver.FindElement("div[text=Second Page]").Click();

            WithTimeMeasurement(() =>
            {
                return Assert.Throws<ApplicationException>(() => Driver.GetDataListWithTimeout(".BaseComponent[ssss]", "aaaa", 2));
            }, (ex, elapsedTime) =>
            {
                Assert.That(ex.Message, Does.Contain("BBSeekerError(PARSER): Unrecognized filter: 'ssss'"));
                Assert.Less(elapsedTime, WaitTime * 1000, "Time to return should be smaller than 2s timeout");
            });
        }

        [Test]
        public void GetDataListAsyncThrowsTimeoutException()
        {
            Driver.FindElement("div[text=Second Page]").Click();

            WithTimeMeasurement(() =>
            {
                return Assert.Throws<TimeoutException>(() => Driver.GetDataListWithTimeout("span[text=Page 2 ssss]", "xyz", 2));
            }, (ex, elapsedTime) =>
            {
                Assert.That(ex.Message, Does.Contain("Async search timed out after"));
                Assert.GreaterOrEqual(elapsedTime, WaitTime * 1000, "Time to return should be equal or greater than 2s timeout");
                Assert.Less(elapsedTime, 3 * 1000, "Time to return should be shorter than 3 seconds");
            });
        }

        [Test]
        public void GetPropertyListAsyncSuccess()
        {
            WithTimeMeasurement(() =>
            {
                return Driver.GetPropertyListWithTimeout(".BasicTableComponent[1]/~.TableRowComponent", "children[0].element.textContent", 2);
            }, (propertyValues, elapsedTime) =>
            {
                Assert.Multiple(() =>
                {
                    Assert.AreEqual(4, propertyValues.Count);
                    Assert.AreEqual("A", propertyValues[0]);
                    Assert.AreEqual("Text A1", propertyValues[1]);
                    Assert.AreEqual("Text A2", propertyValues[2]);
                    Assert.AreEqual("A Footer", propertyValues[3]);
                    Assert.Less(elapsedTime, 2 * 1000, "Time to return should be shorter than 2s timeout");
                });
            });
        }

        [Test]
        public void GetPropertyListAsyncError()
        {
            Driver.FindElement("div[text=Second Page]").Click();

            WithTimeMeasurement(() =>
            {
                return Assert.Throws<ApplicationException>(() => Driver.GetPropertyListWithTimeout(".BaseComponent[ssss]", "aaaa", 2));
            }, (ex, elapsedTime) =>
            {
                Assert.That(ex.Message, Does.Contain("BBSeekerError(PARSER): Unrecognized filter: 'ssss'"));
                Assert.Less(elapsedTime, WaitTime * 1000, "Time to return should be smaller than 2s timeout");
            });
        }

        [Test]
        public void GetPropertyListAsyncThrowsTimeoutException()
        {
            Driver.FindElement("div[text=Second Page]").Click();

            WithTimeMeasurement(() =>
            {
                return Assert.Throws<TimeoutException>(() => Driver.GetPropertyListWithTimeout("span[text=Page 2 ssss]", "xyz", 2));
            }, (ex, elapsedTime) =>
            {
                Assert.That(ex.Message, Does.Contain("Async search timed out after"));
                Assert.GreaterOrEqual(elapsedTime, WaitTime * 1000, "Time to return should be equal or greater than 2s timeout");
                Assert.Less(elapsedTime, 3 * 1000, "Time to return should be shorter than 3 seconds");
            });
        }

        [Test, NonParallelizable]
        public void FindElementsWithTimeoutAndCustomRoot()
        {
            Driver.FindElement("div[text=Second Page]").Click();
            //this is nested layout stacked despite index 0
            var stack = Driver.FindElementWithTimeout(".VerticalStackComponent[0]");

            WithTimeMeasurement(() =>
            {
                return Driver.FindElementsWithTimeout("table", stack);
            }, (tables, elapsedTime) =>
            {
                Assert.AreEqual(2, tables.Count, "Only 2 of the 3 tables were returned");
                Assert.AreEqual("Table Bth-BB11B12B21B22", tables[1].GetAttribute("textContent"), "Expected table was returned");
                Assert.Less(elapsedTime, 2 * 1000, "Time to return should be shorter than 2s timeout");
            });
        }

        [Test, NonParallelizable]
        public void GetAttributeListWithTimeoutAndCustomRoot()
        {
            Driver.FindElement("div[text=Second Page]").Click();
            //this is nested layout stacked despite index 0
            var stack = Driver.FindElementWithTimeout(".VerticalStackComponent[0]");

            WithTimeMeasurement(() =>
            {
                return Driver.GetAttributeListWithTimeout("table", "textContent", stack);
            }, (attributes, elapsedTime) =>
            {
                Assert.AreEqual(2, attributes.Count, "Attributes were returned only from 2 of 3 tables");
                Assert.AreEqual("Table Bth-BB11B12B21B22", attributes[1], "Expected table was returned");
                Assert.Less(elapsedTime, 2 * 1000, "Time to return should be shorter than 2s timeout");
            });
        }

        [Test, NonParallelizable]
        public void GetDataListWithTimeoutAndCustomRoot()
        {
            Driver.FindElement("div[text=Second Page]").Click();
            //this is nested layout stacked despite index 0
            var stack = Driver.FindElementWithTimeout(".VerticalStackComponent[0]");

            WithTimeMeasurement(() =>
            {
                return Driver.GetDataListWithTimeout(".BarChartComponent", "xAxisLabel", stack);
            }, (chartXAxisLabel, elapsedTime) =>
            {
                Assert.AreEqual(1, chartXAxisLabel.Count, "Data were returned only from 1 of 2 charts");
                Assert.AreEqual("Chart 1", chartXAxisLabel[0], "Expected chart was returned");
                Assert.Less(elapsedTime, 2 * 1000, "Time to return should be shorter than 2s timeout");
            });
        }

        [Test, NonParallelizable]
        public void FindElementWithTimeoutAndCustomRoot()
        {
            Driver.FindElement("div[text=Second Page]").Click();
            //this is nested layout stacked despite index 0
            var stack = Driver.FindElementWithTimeout(".VerticalStackComponent[0]");

            WithTimeMeasurement(() =>
            {
                return Driver.FindElementWithTimeout("table[1]", stack);
            }, (table, elapsedTime) =>
            {
                Assert.IsNotNull(table, "Table was returned");
                Assert.AreEqual("Table Bth-BB11B12B21B22", table.GetAttribute("textContent"), "Expected table was returned");
                Assert.Less(elapsedTime, 2 * 1000, "Time to return should be shorter than 2s timeout");
            });
        }

        [Test, NonParallelizable]
        public void GetAttributeWithTimeoutAndCustomRoot()
        {
            Driver.FindElement("div[text=Second Page]").Click();
            //this is nested layout stacked despite index 0
            var stack = Driver.FindElementWithTimeout(".VerticalStackComponent[0]");

            WithTimeMeasurement(() =>
            {
                return Driver.GetAttributeWithTimeout("table[1]", "textContent", stack);
            }, (attributeValue, elapsedTime) =>
            {
                Assert.IsNotNull(attributeValue, "Attribute value was returned");
                Assert.AreEqual("Table Bth-BB11B12B21B22", attributeValue, "Expected table was returned");
                Assert.Less(elapsedTime, 2 * 1000, "Time to return should be shorter than 2s timeout");
            });
        }

        [Test, NonParallelizable]
        public void GetDataWithTimeoutAndCustomRoot()
        {
            Driver.FindElement("div[text=Second Page]").Click();
            //this is nested layout stacked despite index 0
            var stack = Driver.FindElementWithTimeout(".VerticalStackComponent[0]");

            WithTimeMeasurement(() =>
            {
                return Driver.GetDataWithTimeout(".BarChartComponent", "xAxisLabel", stack);
            }, (chartXAxisLabel, elapsedTime) =>
            {
                Assert.IsNotNull(chartXAxisLabel, "Data value was returned");
                Assert.AreEqual("Chart 1", chartXAxisLabel, "Expected chart was returned");
                Assert.Less(elapsedTime, 2 * 1000, "Time to return should be shorter than 2s timeout");
            });
        }

        [Test]
        public void TextStartsWithOperatorSuccess()
        {
            var textContent = Driver.GetAttribute("div[text*=Seco]", "textContent");
            Assert.AreEqual("Second Page", textContent);
        }

        [Test]
        public void AttributeStartsWithOperatorSuccess()
        {
            var textContent = Driver.GetAttribute(".ButtonComponent[@textContent*=Seco]", "textContent");
            Assert.AreEqual("Second Page", textContent);
        }

        [Test]
        public void DataStartsWithOperatorSuccess()
        {
            var dataValue = Driver.GetData(".BarChartComponent[$xAxisLabel*=Months]", "xAxisLabel");
            Assert.AreEqual("Months in Year", dataValue);
        }

        [Test]
        public void TextEndsWithOperatorSuccess()
        {
            var textContent = Driver.GetAttribute("td/span[text^=10 Text]", "textContent");
            Assert.AreEqual("N10 Text", textContent);
        }

        [Test]
        public void AttributeEndsWithOperatorSuccess()
        {
            var textContent = Driver.GetAttribute("td[@textContent^=10 Text]", "textContent");
            Assert.AreEqual("N10 Text", textContent);
        }

        [Test]
        public void DataEndsWithOperatorSuccess()
        {
            var dataValue = Driver.GetData(".BarChartComponent[$xAxisLabel^=Year]", "xAxisLabel");
            Assert.AreEqual("Months in Year", dataValue);
        }

        [Test]
        public void TextStartsWithOperatorFail()
        {
            var elements = Driver.FindElements("div[text*=eco]");
            Assert.AreEqual(0, elements.Count);
        }

        [Test]
        public void AttributeStartsWithOperatorFail()
        {
            var elements = Driver.FindElements("div[@textContent*=eco]");
            Assert.AreEqual(0, elements.Count);
        }

        [Test]
        public void DataStartsWithOperatorFail()
        {
            var elements = Driver.FindElements(".BarChartComponent[$xAxisLabel*=onths]");
            Assert.AreEqual(0, elements.Count);
        }

        [Test]
        public void TextEndsWithOperatorFail()
        {
            var elements = Driver.FindElements("td/span[text^=10 T]");
            Assert.AreEqual(0, elements.Count);
        }

        [Test]
        public void AttributeEndsWithOperatorFail()
        {
            var elements = Driver.FindElements("td[@textContent^=10 T]");
            Assert.AreEqual(0, elements.Count);
        }

        [Test]
        public void DataEndsWithOperatorFail()
        {
            var elements = Driver.FindElements(".BarChartComponent[$xAxisLabel^=Yea]");
            Assert.AreEqual(0, elements.Count);
        }

        [Test]
        public void SearchByKey()
        {
            var text = Driver.GetAttribute("#1", "textContent");
            Assert.AreEqual("2N2 Text", text);
        }

        [Test]
        public void SearchByKeyAsIndirectChild()
        {
            var text = Driver.GetAttribute("table/~#0", "textContent");
            Assert.AreEqual("1N1 Text", text);
        }

        [Test]
        public void SearchByKeyWithMask()
        {
            var texts = Driver.GetAttributeList("#3*", "textContent");
            Assert.AreEqual(2, texts.Count);
            Assert.AreEqual("4N4 Text", texts[0]);
            Assert.AreEqual("Checkbox is: true", texts[1]);
        }

        [Test]
        public void SearchByKeyWithFilter()
        {
            var texts = Driver.GetAttributeList("#3*[0]", "textContent");
            Assert.AreEqual(1, texts.Count);
            Assert.AreEqual("4N4 Text", texts[0]);
        }

        [Test]
        public void SearchByKeyNested()
        {
            var texts = Driver.GetAttributeList("table/*/#3*", "textContent");
            Assert.AreEqual(1, texts.Count);
            Assert.AreEqual("4N4 Text", texts[0]);
        }

        [Test]
        public void ChildIndexNoParent()
        {
            var elements = Driver.FindElementsWithTimeout("td[@textContent~1]and[:1]and[@textContent~Text]");
            Assert.AreEqual(1, elements.Count);
            Assert.AreEqual("N10 Text", elements[0].Text);
        }

        [Test]
        public void ChildIndexParent()
        {
            var elements = Driver.FindElementsWithTimeout("table/~td[@textContent~1]and[:1]and[@textContent~Text]");
            Assert.AreEqual(2, elements.Count);
            Assert.AreEqual("N10 Text", elements[0].Text);
            Assert.AreEqual("Text B1", elements[1].Text);
        }

        [Test]
        public void ChildIndexElementFound()
        {
            var elements = Driver.FindElementsWithTimeout("table[1]/~td[:0]");
            Assert.AreEqual(1, elements.Count);
        }

        [Test]
        public void ChildIndexElementNotFound()
        {
            var elements = Driver.FindElementsWithTimeout("table[1]/~td[:0]");
            Assert.AreEqual(1, elements.Count);

            elements = Driver.FindElements("table[1]/~td[:8]");
            Assert.AreEqual(0, elements.Count);

            elements = Driver.FindElements("td[@textContent~NotPresent]and[:0]");
            Assert.AreEqual(0, elements.Count);

            elements = Driver.FindElements("td[:0]and[@textContent~NotPresent]");
            Assert.AreEqual(0, elements.Count);
        }

        [Test]
        public void ChildIndexThrowsErrorIfRepeatedOnTheSameLevel()
        {
            var ex = Assert.Throws<ApplicationException>(() => Driver.FindElementWithTimeout("table/~tr/td[@textContent~Text]and[:0]and[:1]"));
            Assert.That(ex.Message, Does.Contain("Only one child index filter is allowed per search level but multiple were detected '0, 1'"));
        }

        [Test]
        public void ChildIndexFilterWithLastSuccess()
        {
            var results = Driver.GetAttributeListWithTimeout("table/~tr[:3]/td[:last()]", "textContent");

            Assert.AreEqual(2, results.Count);
            Assert.AreEqual("N3 Text", results[0]);
            Assert.AreEqual("B Footer", results[1]);
        }

        [Test]
        public void ChildIndexWithLastAndOffsetSuccess()
        {
            var results = Driver.GetAttributeListWithTimeout("table/~tr[:3]/td[:last()-1]", "textContent");

            Assert.AreEqual(2, results.Count);
            Assert.AreEqual("3", results[0]);
            Assert.AreEqual("A Footer", results[1]);
        }

        [Test]
        public void ChildIndexWithLastAndOffsetFail()
        {
            Driver.FindElementsWithTimeout("table/~tr[15]"); //just waiting for table content to be present
            //last()-2 results in table cell index -1 (i.e. is not present)
            var results = Driver.FindElements("table/~tr[:3]/td[:last()-2]");

            Assert.AreEqual(0, results.Count);
        }

        [Test]
        public void ChildIndexWithLastAndFiltersSuccess()
        {
            var results = Driver.GetAttributeListWithTimeout("table/~tr/td[:last()]and[@textContent~1]", "textContent");

            Assert.AreEqual(3, results.Count);
            Assert.AreEqual("N1 Text", results[0]);
            Assert.AreEqual("N10 Text", results[1]);
            Assert.AreEqual("Text B1", results[2]);
        }

        [Test]
        public void ChildIndexWithLastAndOffsetAndFiltersSuccess()
        {
            var results = Driver.GetAttributeListWithTimeout("table/~tr/td[:last()-1]and[@textContent~1]", "textContent");

            Assert.AreEqual(3, results.Count);
            Assert.AreEqual("1", results[0]);
            Assert.AreEqual("10", results[1]);
            Assert.AreEqual("Text A1", results[2]);
        }

        [Test]
        public void ChildIndexWithLastAndFiltersFail()
        {
            Driver.FindElementsWithTimeout("table/~tr[15]"); //just waiting for table content to be present
            var results = Driver.FindElements("table/~tr/td[:last()]and[@textContent~XYZ]");

            Assert.AreEqual(0, results.Count);
        }

        [Test]
        public void ChildIndexWithLastAndOffsetAndFiltersFail()
        {
            Driver.FindElementsWithTimeout("table/~tr[15]"); //just waiting for table content to be present
            var results = Driver.FindElements("table/~tr/td[:last()-10]and[@textContent~1]");

            Assert.AreEqual(0, results.Count);
        }

        [Test]
        public void ChildIndexWithLastAndFiltersIsCommutative()
        {
            var results = Driver.GetAttributeListWithTimeout("table/~tr/td[@textContent~1]and[:last()]", "textContent");

            Assert.AreEqual(3, results.Count);
            Assert.AreEqual("N1 Text", results[0]);
            Assert.AreEqual("N10 Text", results[1]);
            Assert.AreEqual("Text B1", results[2]);
        }

        [Test]
        public void ChildIndexWithLastAndOffsetAndFiltersIsCommutative()
        {
            var results = Driver.GetAttributeListWithTimeout("table/~tr/td[@textContent~1]and[:last()-1]", "textContent");

            Assert.AreEqual(3, results.Count);
            Assert.AreEqual("1", results[0]);
            Assert.AreEqual("10", results[1]);
            Assert.AreEqual("Text A1", results[2]);
        }

        [Test]
        public void GetCtxSuccess()
        {
            var value = Driver.GetCtx(".PieChartComponent", "data");

            Assert.That(value, Is.EqualTo("{\"chartSize\":\"15em\",\"chartInnerSize\":\"40%\",\"animateSelectionOnHover\":false,\"dataCtx\":{}}"));
        }

        [Test]
        public void GetCtxFail()
        {
            var value = Driver.GetCtx(".PieChartComponent", "abcd");

            Assert.That(value, Is.Null);
        }

        [Test]
        public void GetCtxNoPropertyFail()
        {
            var value = Driver.GetCtx("abcd", "data");

            Assert.That(value, Is.Null);
        }

        [Test]
        public void GetCtxTooManyReturnedButOneExpectedThrowsApplicationError()
        {
            var ex = Assert.Throws<ApplicationException>(() => Driver.GetCtx(".TableCellComponent", "data"));
            Assert.That(ex.Message, Does.Contain("Too many results returned for expression"));
        }

        [Test, NonParallelizable]
        public void GetCtxWithTimeoutSuccess()
        {
            Driver.FindElement("div[text=Second Page]").Click();
            WithTimeMeasurement(() =>
            {
                return Driver.GetCtxWithTimeout(".BasicTableComponent[0]", "data");
            }, (value, elapsedTime) =>
            {
                Assert.That(value, Is.EqualTo("{\"body\":{},\"rowBackgroundColor\":\"transparent\",\"evenRowBackgroundColor\":\"transparent\",\"useStickyHeader\":false,\"borderCollapse\":\"separate\"}"));
                Assert.Less(elapsedTime, 2 * 1000, "Time to return should be shorter than 2s timeout");
            });
        }

        [Test, NonParallelizable]
        public void GetCtxWithTimeoutThrowsTimeoutException()
        {
            Driver.FindElement("div[text=Second Page]").Click();
            WithTimeMeasurement(() =>
            {
                return Assert.Throws<TimeoutException>(() => Driver.GetCtxWithTimeout(".abc", "data"));
            }, (ex, elapsedTime) =>
            {
                Assert.That(ex.Message, Does.Contain("Async search timed out after"));
                Assert.GreaterOrEqual(elapsedTime, WaitTime * 1000, "Time to return should be equal or greater than 2s timeout");
                Assert.Less(elapsedTime, 3 * 1000, "Time to return should be shorter than 3 seconds");
            });
        }

        [Test]
        public void GetCtxWithTimeoutTooManyReturnedButOneExpectedThrowsApplicationError()
        {
            Driver.FindElement("div[text=Second Page]").Click();
            WithTimeMeasurement(() =>
            {
                return Assert.Throws<ApplicationException>(() => Driver.GetCtxWithTimeout(".TableCellComponent", "data"));
            }, (ex, elapsedTime) =>
            {
                Assert.That(ex.Message, Does.Contain("Too many results returned for expression"));
                Assert.Less(elapsedTime, 2 * 1000, "Time to return should be shorter than 2s timeout");
            });
        }

        [Test, NonParallelizable]
        public void GetCtxListWithTimeout()
        {
            WithTimeMeasurement(() =>
            {
                return Driver.GetCtxListWithTimeout(".TableCellComponent", "data");
            }, (values, elapsedTime) =>
            {
                Assert.AreEqual(31, values.Count, "31 standard cells are found");
                Assert.AreEqual(
                    "{\"colspan\":1,\"rowspan\":1,\"width\":\"auto\",\"verticalAlign\":\"middle\"}",
                    values[5], "Expected value was returned");
                Assert.Less(elapsedTime, 2 * 1000, "Time to return should be shorter than 2s timeout");
            });
        }

        [Test, NonParallelizable]
        public void GetCtxListWithTimeoutAndCustomRoot()
        {
            Driver.FindElement("div[text=Second Page]").Click();
            //this is nested layout stacked despite index 0
            var stack = Driver.FindElementWithTimeout(".VerticalStackComponent[0]");

            WithTimeMeasurement(() =>
            {
                return Driver.GetCtxListWithTimeout("table", "data", stack);
            }, (values, elapsedTime) =>
            {
                Assert.AreEqual(2, values.Count, "Only 2 of the 3 context values were returned (3 tables total, 2 in the parent)");
                Assert.AreEqual(
                    "{\"body\":{},\"rowBackgroundColor\":\"transparent\",\"evenRowBackgroundColor\":\"transparent\",\"useStickyHeader\":false,\"borderCollapse\":\"separate\"}",
                    values[1], "Expected value was returned");
                Assert.Less(elapsedTime, 2 * 1000, "Time to return should be shorter than 2s timeout");
            });
        }

        [Test]
        public void GetFileInputSuccess()
        {
            OpenFileInputSamplePage();
            var element = Driver.GetFileInput(".helpers-file-upload-area[0]");

            Assert.That(element.TagName, Is.EqualTo("input"));
            Assert.That(element.GetAttribute("type"), Is.EqualTo("file"));
        }

        [Test]
        public void GetFileInputLocatorFail()
        {
            OpenFileInputSamplePage();
            var element = Driver.GetFileInput("abc");

            Assert.That(element, Is.Null);
        }

        [Test]
        public void GetFileInputWithoutNeededProperty()
        {
            OpenFileInputSamplePage();
            var element = Driver.GetFileInput(".bobwai--l-field[0]"); //any object without ctx.fileInput property

            Assert.That(element, Is.Null, "BBSeeker should return null if it's ctx.fileInput property is missing, null or undefined");
        }

        [Test]
        public void GetFileInputWithTimeoutSuccess()
        {
            Driver.FindElement("div[text=File Input]").Click();
            WithTimeMeasurement(() =>
            {
                return Driver.GetFileInputWithTimeout(".helpers-file-upload-area[1]");
            }, (inputElement, elapsedTime) =>
            {

                Assert.That(inputElement.TagName, Is.EqualTo("input"));
                Assert.That(inputElement.GetAttribute("type"), Is.EqualTo("file"));
                Assert.Less(elapsedTime, 2 * 1000, "Time to return should be shorter than 2s timeout");
            });
        }

        [Test]
        public void GetFileWithTimeoutFail()
        {
            Driver.FindElement("div[text=File Input]").Click();
            WithTimeMeasurement(() =>
            {
                return Assert.Throws<TimeoutException>(() => Driver.GetFileInputWithTimeout("abc"));
            }, (ex, elapsedTime) =>
            {
                Assert.That(ex.Message, Does.Contain("Async search timed out after"));
                Assert.GreaterOrEqual(elapsedTime, WaitTime * 1000, "Time to return should be equal or greater than 2s timeout");
                Assert.Less(elapsedTime, 3 * 1000, "Time to return should be shorter than 3 seconds");
            });
        }

        [Test]
        public void GetFileInputWithTimeoutWithoutNeededProperty()
        {
            Driver.FindElement("div[text=File Input]").Click();
            WithTimeMeasurement(() =>
            {
                return Assert.Throws<TimeoutException>(() => Driver.GetFileInputWithTimeout(".bobwai--l-field[0]")); //any object without ctx.fileInput property
            }, (ex, elapsedTime) =>
            {
                Assert.That(ex.Message, Does.Contain("Async search timed out after"));
                Assert.GreaterOrEqual(elapsedTime, WaitTime * 1000, "Time to return should be equal or greater than 2s timeout");
                Assert.Less(elapsedTime, 3 * 1000, "Time to return should be shorter than 3 seconds");
            });
        }

        [Test]
        public void GetFileInputListWithTimeoutSuccess()
        {
            Driver.FindElement("div[text=File Input]").Click();
            WithTimeMeasurement(() =>
            {
                return Driver.GetFileInputListWithTimeout(".helpers-file-upload-area");
            }, (elements, elapsedTime) =>
            {
                Assert.That(elements.Count, Is.EqualTo(2));
                Assert.That(elements[0].TagName, Is.EqualTo("input"));
                Assert.That(elements[1].TagName, Is.EqualTo("input"));
                Assert.Less(elapsedTime, 2 * 1000, "Time to return should be shorter than 2s timeout");
            });
        }

        [Test]
        public void GetFileInputListWithTimeoutAndCustomRoot()
        {
            Driver.FindElement("div[text=File Input]").Click();
            WithTimeMeasurement(() =>
            {
                var customRoot = Driver.FindElement(".bobwai--l-field[0]");
                return Driver.GetFileInputListWithTimeout(".helpers-file-upload-area", customRoot);
            }, (elements, elapsedTime) =>
            {
                Assert.That(elements.Count, Is.EqualTo(1));
                Assert.That(elements[0].TagName, Is.EqualTo("input"));
                Assert.Less(elapsedTime, 2 * 1000, "Time to return should be shorter than 2s timeout");
            });
        }

        private long WithTimeMeasurement<T>(Func<T> execution, Action<T, long> asserts)
        {
            var start = DateTime.Now.Ticks / TimeSpan.TicksPerMillisecond;
            T executionResult = execution();
            var end = DateTime.Now.Ticks / TimeSpan.TicksPerMillisecond;
            var elapsedTime = end - start;
            TestContext.Out.WriteLine($"Measured time: {elapsedTime}ms");
            asserts(executionResult, elapsedTime);

            return elapsedTime;
        }

        private void OpenFileInputSamplePage()
        {
            Driver.FindElement("div[text=File Input]").Click();
            Driver.FindElementWithTimeout(".bobwai--l-field-group"); //wait for page to be rendered
        }
    }
}

/*
Please note that Selenium JavascriptExecutor returns only folowing types:
Boolean, Long, String, List, Map, WebElement, or null.

https://seleniumhq.github.io/selenium/docs/api/java/org/openqa/selenium/JavascriptExecutor.html

i.e. due to this limitation I am unable to implement a better interface for it. Because of this and some simplification, the following methods return only
strings, string arrays, web elements, arrays of web elements or null. Any bobril object contained in the fetched property is attempted to be JSON stringified
and returned as string. You might try to deserialize resulting JSON string into a custom DTO or dynamic ExpandoObject if needed.
*/

using OpenQA.Selenium;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Drawing;

namespace BBSeeker
{
    public static class WebDriverExtensions
    {

        static uint _timeout = 2;

        public static void SetBBSeekerDefaultTimeout(this IWebDriver driver, uint timeoutInSeconds)
        {
            _timeout = timeoutInSeconds;
        }

        public static void SpyTranslations(this IWebDriver driver, bool enable, string prefix = "[", string suffix = "]")
        {
            IJavaScriptExecutor jsExecutor = driver as IJavaScriptExecutor;
            try
            {
                if (enable)
                {
                    jsExecutor.ExecuteScript($"b.spyTr(function(t){{return '{prefix}' + t + '{suffix}'; }});b.invalidateStyles();");
                }
                else
                {
                    jsExecutor.ExecuteScript("b.spyTr(null);b.invalidateStyles();");
                }
            }
            catch (Exception e)
            {
                throw new InvalidOperationException("Failed to execute spyTr() function in bobril. Is page compiled in a bobril version that does have this function?", e);
            }
        }

        /// <summary>
        /// Uses BBSeeker to find elements.
        /// </summary>
        /// <param name="driver">driver to be extended</param>
        /// <param name="bbSeekerSearchExpression">BBSeeker style search expression</param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns>collection of IWebElement</returns>
        public static ReadOnlyCollection<IWebElement> FindElements(this IWebDriver driver, string bbSeekerSearchExpression, IWebElement searchRoot = null)
        {
            var rootArgument = (searchRoot == null) ? "" : ", arguments[0]";
            var searchScript = $"return BBSeeker.findElements(\"{bbSeekerSearchExpression}\"{rootArgument});";
            return ExecuteWebElementResultSetSearchSync(driver, searchScript, searchRoot);
        }

        /// <summary>
        /// Uses BBSeeker to find elements. Waits for an element to be available. Default BBSeeker timeout is used.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static ReadOnlyCollection<IWebElement> FindElementsWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, IWebElement searchRoot = null)
        {
            return FindElementsWithTimeout(driver, bbSeekerSearchExpression, _timeout, searchRoot);
        }

        /// <summary>
        /// Search with timeout. Asynchronously waits on a webdriver side for elements to be available.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="timeout">in seconds</param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns>found elements, TimeoutException for timeout, ApplicationError if result array is null and no error is returned</returns>
        public static ReadOnlyCollection<IWebElement> FindElementsWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, uint timeout, IWebElement searchRoot = null)
        {
            var timeoutMs = timeout * 1000;
            var rootArgument = (searchRoot == null) ? "" : ", arguments[0]";
            var searchScript = $"var doneCallback = arguments[arguments.length -1]; BBSeeker.findElementsWithTimeout(\"{bbSeekerSearchExpression}\", {timeoutMs}, doneCallback{rootArgument});";
            return ExecuteWebElementResultSetSearchAsync(driver, timeout, searchScript, searchRoot);
        }

        /// <summary>
        /// Finds all elements matching the expression, extracts attribute and returns it in a list.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="attributePropertyName"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static List<string> GetAttributeList(this IWebDriver driver, string bbSeekerSearchExpression, string attributePropertyName, IWebElement searchRoot = null)
        {
            var rootArgument = (searchRoot == null) ? "" : ", arguments[0]";
            var searchScript = $"return BBSeeker.getAttribute(\"{bbSeekerSearchExpression}\",\"{attributePropertyName}\"{rootArgument});";
            return ExecuteStringResultSetSearchSync(driver, searchScript, searchRoot);
        }

        /// <summary>
        /// Finds all elements matching the expression, extracts data and returns it in a list.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="dataPropertyName"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static List<string> GetDataList(this IWebDriver driver, string bbSeekerSearchExpression, string dataPropertyName, IWebElement searchRoot = null)
        {
            var rootArgument = (searchRoot == null) ? "" : ", arguments[0]";
            var searchScript = $"return BBSeeker.getData(\"{bbSeekerSearchExpression}\",\"{dataPropertyName}\"{rootArgument});";
            return ExecuteStringResultSetSearchSync(driver, searchScript, searchRoot);
        }

        /// <summary>
        /// Finds all elements matching the expression, extracts property value and returns it in a list.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="propertyPath"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static List<string> GetPropertyList(this IWebDriver driver, string bbSeekerSearchExpression, string propertyPath, IWebElement searchRoot = null)
        {
            var rootArgument = (searchRoot == null) ? "" : ", arguments[0]";
            var searchScript = $"return BBSeeker.getProperty(\"{bbSeekerSearchExpression}\",\"{propertyPath}\"{rootArgument});";
            return ExecuteStringResultSetSearchSync(driver, searchScript, searchRoot);
        }

        /// <summary>
        /// Finds all elements matching the expression, extracts context property value and returns it in a list.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="ctxPropertyName"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static List<string> GetCtxList(this IWebDriver driver, string bbSeekerSearchExpression, string ctxPropertyName, IWebElement searchRoot = null)
        {
            var rootArgument = (searchRoot == null) ? "" : ", arguments[0]";
            var searchScript = $"return BBSeeker.getCtx(\"{bbSeekerSearchExpression}\",\"{ctxPropertyName}\"{rootArgument});";
            return ExecuteStringResultSetSearchSync(driver, searchScript, searchRoot);
        }

        /// <summary>
        /// Finds all elements matching the expression and attempts to extract value of ctx.fileInput property as instance of IWebElement.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static ReadOnlyCollection<IWebElement> GetFileInputList(this IWebDriver driver, string bbSeekerSearchExpression, IWebElement searchRoot = null)
        {
            var rootArgument = (searchRoot == null) ? "" : ", arguments[0]";
            var searchScript = $"return BBSeeker.getFileInput(\"{bbSeekerSearchExpression}\"{rootArgument});";
            return ExecuteWebElementResultSetSearchSync(driver, searchScript, searchRoot);
        }

        /// <summary>
        /// Finds all elements matching the expression, extracts attribute and returns it in a list. Uses default BBSeeker timeout.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="attributeName"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static List<string> GetAttributeListWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, string attributeName, IWebElement searchRoot = null)
        {
            return GetAttributeListWithTimeout(driver, bbSeekerSearchExpression, attributeName, _timeout, searchRoot);
        }

        /// <summary>
        /// Finds all elements matching the expression, extracts attribute and returns it in a list.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="attributeName"></param>
        /// <param name="timeout"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static List<string> GetAttributeListWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, string attributeName, uint timeout, IWebElement searchRoot = null)
        {
            var rootArgument = (searchRoot == null) ? "" : ", arguments[0]";
            var searchScript = $"var doneCallback = arguments[arguments.length -1]; BBSeeker.getAttributeWithTimeout(\"{bbSeekerSearchExpression}\", \"{attributeName}\", {timeout * 1000}, doneCallback{rootArgument});";
            return ExecuteStringResultSetSearchAsync(driver, timeout, searchScript, searchRoot);
        }

        /// <summary>
        /// Finds all elements matching the expression, extracts data and returns it in a list. Uses default BBSeeker timeout.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="dataName"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static List<string> GetDataListWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, string dataName, IWebElement searchRoot = null)
        {
            return GetDataListWithTimeout(driver, bbSeekerSearchExpression, dataName, _timeout, searchRoot);
        }

        /// <summary>
        /// Finds all elements matching the expression, extracts data and returns it in a list.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="dataName"></param>
        /// <param name="timeout"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static List<string> GetDataListWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, string dataName, uint timeout, IWebElement searchRoot = null)
        {
            var rootArgument = (searchRoot == null) ? "" : ", arguments[0]";
            var searchScript = $"var doneCallback = arguments[arguments.length -1]; BBSeeker.getDataWithTimeout(\"{bbSeekerSearchExpression}\", \"{dataName}\", {timeout * 1000}, doneCallback{rootArgument});";
            return ExecuteStringResultSetSearchAsync(driver, timeout, searchScript, searchRoot);
        }

        /// <summary>
        /// Finds all elements matching the expression, extracts property value and returns it in a list.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="propertyPath"></param>
        /// <param name="timeout"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static List<string> GetPropertyListWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, string propertyPath, uint timeout, IWebElement searchRoot = null)
        {
            var rootArgument = (searchRoot == null) ? "" : ", arguments[0]";
            var searchScript = $"var doneCallback = arguments[arguments.length -1]; BBSeeker.getPropertyWithTimeout(\"{bbSeekerSearchExpression}\", \"{propertyPath}\", {timeout * 1000}, doneCallback{rootArgument});";
            return ExecuteStringResultSetSearchAsync(driver, timeout, searchScript, searchRoot);
        }

        /// <summary>
        /// Finds all elements matching the expression, extracts context property value and returns it in a list.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="ctxPropertyName"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static List<string> GetCtxListWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, string ctxPropertyName, IWebElement searchRoot = null)
        {
            return GetCtxListWithTimeout(driver, bbSeekerSearchExpression, ctxPropertyName, _timeout, searchRoot);
        }

        /// <summary>
        /// Finds all elements matching the expression, extracts context property value and returns it in a list.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="ctxPropertyName"></param>
        /// <param name="timeout"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static List<string> GetCtxListWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, string ctxPropertyName, uint timeout, IWebElement searchRoot = null)
        {
            var rootArgument = (searchRoot == null) ? "" : ", arguments[0]";
            var searchScript = $"var doneCallback = arguments[arguments.length -1]; BBSeeker.getCtxWithTimeout(\"{bbSeekerSearchExpression}\", \"{ctxPropertyName}\", {timeout * 1000}, doneCallback{rootArgument});";
            return ExecuteStringResultSetSearchAsync(driver, timeout, searchScript, searchRoot);
        }

        /// <summary>
        /// Finds all elements matching the expression, extracts cxt.fileInput property value as IWebElement and returns it in a list.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static ReadOnlyCollection<IWebElement> GetFileInputListWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, IWebElement searchRoot = null)
        {
            return GetFileInputListWithTimeout(driver, bbSeekerSearchExpression, _timeout, searchRoot);
        }

        /// <summary>
        /// Finds all elements matching the expression, extracts cxt.fileInput property value as IWebElement and returns it in a list.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="timeout"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static ReadOnlyCollection<IWebElement> GetFileInputListWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, uint timeout, IWebElement searchRoot = null)
        {
            var rootArgument = (searchRoot == null) ? "" : ", arguments[0]";
            var searchScript = $"var doneCallback = arguments[arguments.length -1]; BBSeeker.getFileInputWithTimeout(\"{bbSeekerSearchExpression}\", {timeout * 1000}, doneCallback{rootArgument});";
            return ExecuteWebElementResultSetSearchAsync(driver, timeout, searchScript, searchRoot);
        }

        private static List<string> ExecuteStringResultSetSearchSync(IWebDriver driver, string searchScript, IWebElement searchRoot)
        {
            return ExecuteWithBBSeeker(driver, (jsExecutor) =>
            {
                return ConvertObjectCollectionToStringList(
                    jsExecutor.ExecuteScript(searchScript, searchRoot) as ReadOnlyCollection<object>);
            });
        }

        private static List<string> ExecuteStringResultSetSearchAsync(IWebDriver driver, uint timeout, string searchScript, IWebElement searchRoot)
        {
            driver.SetAsyncScriptTimeout(timeout);
            return ExecuteWithBBSeeker(driver, (jsExecutor) =>
            {
                return ExecuteAsyncSearchForStringResults(jsExecutor, searchScript, searchRoot);
            });
        }

        private static ReadOnlyCollection<IWebElement> ExecuteWebElementResultSetSearchSync(IWebDriver driver, string searchScript, IWebElement searchRoot)
        {
            return ExecuteWithBBSeeker(driver, (jsExecutor) =>
            {
                return jsExecutor.ExecuteScript(searchScript, searchRoot) as ReadOnlyCollection<IWebElement>;
            }) ?? new ReadOnlyCollection<IWebElement>(new List<IWebElement>());
        }

        private static ReadOnlyCollection<IWebElement> ExecuteWebElementResultSetSearchAsync(IWebDriver driver, uint timeout, string searchScript, IWebElement searchRoot)
        {
            driver.SetAsyncScriptTimeout(timeout);
            return ExecuteWithBBSeeker(driver, (jsExecutor) =>
            {
                return ExecuteAsyncSearch(jsExecutor, searchScript, searchRoot);
            });
        }

        /// <summary>
        /// Waits up to a given time for the element to be removed from a page or throws a TimeoutException.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <returns>true if element was removed before timeout</returns>
        public static bool WaitUntilElementIsNotPresent(this IWebDriver driver, string bbSeekerSearchExpression)
        {
            return WaitUntilElementIsNotPresent(driver, bbSeekerSearchExpression, _timeout);
        }

        /// <summary>
        /// Waits up to a given time for the element to be removed from a page or throws a TimeoutException.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="timeout"></param>
        /// <returns>true if element was removed before timeout</returns>
        public static bool WaitUntilElementIsNotPresent(this IWebDriver driver, string bbSeekerSearchExpression, uint timeout)
        {
            driver.SetAsyncScriptTimeout(timeout);

            var timeoutMs = timeout * 1000;
            var searchScript = "var doneCallback = arguments[arguments.length -1]; BBSeeker.waitForElementNotPresent(\"" + bbSeekerSearchExpression + "\", " + timeoutMs + ", doneCallback);";
            return ExecuteWithBBSeeker(driver, (jsExecutor) =>
            {
                return ExecuteWaitUntilNotPresent(jsExecutor, searchScript, bbSeekerSearchExpression);
            });
        }

        private static T ExecuteWithBBSeeker<T>(IWebDriver driver, Func<IJavaScriptExecutor, T> executableBBSeekerAction, short retries = 3)
        {
            try
            {
                IJavaScriptExecutor jsExecutor = driver as IJavaScriptExecutor;
                try
                {
                    return executableBBSeekerAction(jsExecutor);
                }
                catch (Exception e) when (
                (e is InvalidOperationException || e is WebDriverException)
                && (e.Message.Contains("BBSeeker is not defined") || e.Message.Contains("Can't find variable: BBSeeker"))
                )
                {
                    //BBSeeker is not injected into a page. Try injecting it and perform search once again.
                    var script = BBSeekerScript.Get();
                    jsExecutor.ExecuteScript(script);
                    return executableBBSeekerAction(jsExecutor);
                }
            }
            catch (Exception e)
            {
                if (e.Message.Contains("b is not defined") && retries > 0)
                {
                    Console.WriteLine("Bobril not found or not yet initialized. Number of remaining retries: " + retries);
                    retries--;
                    System.Threading.Thread.Sleep(1000);
                    return ExecuteWithBBSeeker(driver, executableBBSeekerAction, retries);
                }
                throw;
            }
        }

        /// <summary>
        /// Uses BBSeeker to find a single IWebElements. Throws an ApplicationException if more than one element is found. 
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns>IWebElement if found, null if not found, or throws an ApplicationException if more than one match is found</returns>
        public static IWebElement FindElement(this IWebDriver driver, string bbSeekerSearchExpression, IWebElement searchRoot = null)
        {
            var elements = driver.FindElements(bbSeekerSearchExpression, searchRoot);
            return ToSingleOrDefaultSync(elements, bbSeekerSearchExpression);
        }

        /// <summary>
        /// Finds element matching the expression, extracts attribute and returns it.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="attributeName"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static string GetAttribute(this IWebDriver driver, string bbSeekerSearchExpression, string attributeName, IWebElement searchRoot = null)
        {
            var attrValues = driver.GetAttributeList(bbSeekerSearchExpression, attributeName, searchRoot);
            return ToSingleOrDefaultSync(attrValues, bbSeekerSearchExpression);
        }

        /// <summary>
        /// Finds element matching the expression, extracts data and returns it.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="dataName"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static string GetData(this IWebDriver driver, string bbSeekerSearchExpression, string dataName, IWebElement searchRoot = null)
        {
            var dataValues = driver.GetDataList(bbSeekerSearchExpression, dataName, searchRoot);
            return ToSingleOrDefaultSync(dataValues, bbSeekerSearchExpression);
        }

        /// <summary>
        /// Finds element matching the expression, extracts property value and returns it.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="propertyPath"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static string GetProperty(this IWebDriver driver, string bbSeekerSearchExpression, string propertyPath, IWebElement searchRoot = null)
        {
            var propertyValues = driver.GetPropertyList(bbSeekerSearchExpression, propertyPath, searchRoot);
            return ToSingleOrDefaultSync(propertyValues, bbSeekerSearchExpression);
        }

        /// <summary>
        /// Finds element matching the expression, extracts value of a property in ctx and returns it.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="ctxPropertyName"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static string GetCtx(this IWebDriver driver, string bbSeekerSearchExpression, string ctxPropertyName, IWebElement searchRoot = null)
        {
            var valueOfMatchingCtxProperty = driver.GetCtxList(bbSeekerSearchExpression, ctxPropertyName, searchRoot);
            return ToSingleOrDefaultSync(valueOfMatchingCtxProperty, bbSeekerSearchExpression);
        }

        /// <summary>
        /// Finds element matching the expression and attempts to extract value of ctx.fileInput property as instance of IWebElement.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static IWebElement GetFileInput(this IWebDriver driver, string bbSeekerSearchExpression, IWebElement searchRoot = null)
        {
            var fileInputList = driver.GetFileInputList(bbSeekerSearchExpression, searchRoot);
            return ToSingleOrDefaultSync(fileInputList, bbSeekerSearchExpression);
        }

        /// <summary>
        /// Search with timeout. Asynchronously waits on a webdriver side for a single element to be available.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="timeout">in seconds</param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns>IWebElement if found, TimeoutException for timeout, ApplicationError if result is null and no error is returned</returns>
        public static IWebElement FindElementWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, uint timeout, IWebElement searchRoot = null)
        {
            var elements = driver.FindElementsWithTimeout(bbSeekerSearchExpression, timeout, searchRoot);
            return ToSingleAsync(elements, bbSeekerSearchExpression);
        }

        /// <summary>
        /// Uses BBSeeker to find element. Waits for an element to be available. Default BBSeeker timeout is used.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static IWebElement FindElementWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, IWebElement searchRoot = null)
        {
            return FindElementWithTimeout(driver, bbSeekerSearchExpression, _timeout, searchRoot);
        }

        /// <summary>
        /// Finds element matching the expression, extracts attribute and returns it. Uses default BBSeeker timeout.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="attributeName"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static string GetAttributeWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, string attributeName, IWebElement searchRoot = null)
        {
            return GetAttributeWithTimeout(driver, bbSeekerSearchExpression, attributeName, _timeout, searchRoot);
        }

        /// <summary>
        /// Finds element matching the expression, extracts attribute and returns it.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="attributeName"></param>
        /// <param name="timeout"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static string GetAttributeWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, string attributeName, uint timeout, IWebElement searchRoot = null)
        {
            var attrValues = driver.GetAttributeListWithTimeout(bbSeekerSearchExpression, attributeName, timeout, searchRoot);
            return ToSingleAsync(attrValues, bbSeekerSearchExpression);
        }

        /// <summary>
        /// Finds element matching the expression, extracts data and returns it. Uses default BBSeeker timeout.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="dataName"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static string GetDataWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, string dataName, IWebElement searchRoot = null)
        {
            return GetDataWithTimeout(driver, bbSeekerSearchExpression, dataName, _timeout, searchRoot);
        }

        /// <summary>
        /// Finds element matching the expression, extracts data and returns it.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="dataName"></param>
        /// <param name="timeout"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static string GetDataWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, string dataName, uint timeout, IWebElement searchRoot = null)
        {
            var dataValues = driver.GetDataListWithTimeout(bbSeekerSearchExpression, dataName, timeout, searchRoot);
            return ToSingleAsync(dataValues, bbSeekerSearchExpression);
        }

        /// <summary>
        /// Finds element matching the expression, extracts property value and returns it. Uses default BBSeeker timeout.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="propertyPath"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static string GetPropertyWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, string propertyPath, IWebElement searchRoot = null)
        {
            return GetPropertyWithTimeout(driver, bbSeekerSearchExpression, propertyPath, _timeout, searchRoot);
        }

        /// <summary>
        /// Finds element matching the expression, extracts property value and returns it.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="propertyPath"></param>
        /// <param name="timeout"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static string GetPropertyWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, string propertyPath, uint timeout, IWebElement searchRoot = null)
        {
            var dataValues = driver.GetPropertyListWithTimeout(bbSeekerSearchExpression, propertyPath, timeout, searchRoot);
            return ToSingleAsync(dataValues, bbSeekerSearchExpression);
        }

        /// <summary>
        /// Finds element matching the expression, extracts specified context property value and returns it. Uses default BBSeeker timeout.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="ctxPropertyName"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static string GetCtxWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, string ctxPropertyName, IWebElement searchRoot = null)
        {
            return GetCtxWithTimeout(driver, bbSeekerSearchExpression, ctxPropertyName, _timeout, searchRoot);
        }

        /// <summary>
        /// Finds element matching the expression, extracts specified context property value and returns it.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="ctxPropertyName"></param>
        /// <param name="timeout"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        public static string GetCtxWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, string ctxPropertyName, uint timeout, IWebElement searchRoot = null)
        {
            var matchingCtxPropertyValue = driver.GetCtxListWithTimeout(bbSeekerSearchExpression, ctxPropertyName, timeout, searchRoot);
            return ToSingleAsync(matchingCtxPropertyValue, bbSeekerSearchExpression);
        }

        /// <summary>
        /// Finds element matching the expression and attempts to extract value of ctx.fileInput property as instance of IWebElement.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns>input element or exception</returns>
        public static IWebElement GetFileInputWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, IWebElement searchRoot = null)
        {
            return GetFileInputWithTimeout(driver, bbSeekerSearchExpression, _timeout, searchRoot);
        }

        /// <summary>
        /// Finds element matching the expression and attempts to extract value of ctx.fileInput property as instance of IWebElement.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="bbSeekerSearchExpression"></param>
        /// <param name="timeout"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns>input element or exception</returns>
        public static IWebElement GetFileInputWithTimeout(this IWebDriver driver, string bbSeekerSearchExpression, uint timeout, IWebElement searchRoot = null)
        {
            var matchingCtxPropertyValue = driver.GetFileInputListWithTimeout(bbSeekerSearchExpression, timeout, searchRoot);
            return ToSingleAsync(matchingCtxPropertyValue, bbSeekerSearchExpression);
        }

        /// <summary>
        /// Returns position of the last click in the browser viewport.
        /// REQUIRES that any BBSeeker search method is executed before this so that BBSeeker is injected. 
        /// </summary>
        /// <param name="driver"></param>
        /// <returns></returns>
        public static Point GetLastClickPosition(this IWebDriver driver)
        {
            try
            {
                IJavaScriptExecutor jsExecutor = driver as IJavaScriptExecutor;
                var position = jsExecutor.ExecuteScript("return BBSeeker.getLastClickPosition()") as ReadOnlyCollection<object>;

                return new Point(Convert.ToInt32(position[0]), Convert.ToInt32(position[1]));
            }
            catch (Exception e)
            {
                Console.WriteLine($"Could not get last click position. Returning [0,0] as a failsafe. Reason: '{e.ToString()}'");
                return new Point(0, 0);
            }
        }

        /// <summary>
        /// Sets async script timeout to provided timeout value + 1 second. Added second serves as a tolerance for JavaScript to return callback.
        /// </summary>
        /// <param name="driver"></param>
        /// <param name="timeout"></param>
        public static void SetAsyncScriptTimeout(this IWebDriver driver, uint timeout)
        {
            //just wait a bit longer so value can be returned, javascript is not very precise (+1)
            driver.Manage().Timeouts().AsynchronousJavaScript = TimeSpan.FromSeconds(timeout + 1);
        }

        /// <summary>
        /// Internal resolver for async search.
        /// </summary>
        /// <param name="jsExecutor"></param>
        /// <param name="searchScript"></param>
        /// <param name="searchRoot">(optional) specify element which will be used as search root</param>
        /// <returns></returns>
        private static ReadOnlyCollection<IWebElement> ExecuteAsyncSearch(IJavaScriptExecutor jsExecutor, string searchScript, IWebElement searchRoot)
        {
            var asyncResult = jsExecutor.ExecuteAsyncScript(searchScript, searchRoot) as ReadOnlyCollection<object>;
            var elements = asyncResult[0] as ReadOnlyCollection<IWebElement>;
            var error = asyncResult[1] as string;
            HandleInvalidResult(elements, error, searchScript);
            return elements;
        }

        private static List<string> ExecuteAsyncSearchForStringResults(IJavaScriptExecutor jsExecutor, string searchScript, IWebElement searchRoot = null)
        {
            var asyncResult = jsExecutor.ExecuteAsyncScript(searchScript, searchRoot) as ReadOnlyCollection<object>;
            var searchResult = asyncResult[0] as ReadOnlyCollection<object>;
            var error = asyncResult[1] as string;
            HandleInvalidResult(searchResult, error, searchScript);
            return ConvertObjectCollectionToStringList(searchResult);
        }

        private static void HandleInvalidResult(object searchResult, string error, string script)
        {
            if (error != null)
            {
                StdoutScript(script);
                if (error.Contains("Async search timed out"))
                {
                    StdoutScript(script);
                    throw new TimeoutException(error);
                }
                else
                {
                    StdoutScript(script);
                    throw new ApplicationException("Error occured during BBSeeker search: '" + error + "'");
                }
            }
            if (searchResult == null)
            {
                StdoutScript(script);
                throw new ApplicationException("Unexpected state occured in the async search script, results are null."
                    + "This should not happen unless error is returned instead. This might be a script author's error.");
            }
        }

        private static bool ExecuteWaitUntilNotPresent(IJavaScriptExecutor jsExecutor, string searchScript, string bbSeekerSearchExpression)
        {
            var asyncResult = jsExecutor.ExecuteAsyncScript(searchScript) as ReadOnlyCollection<object>;
            var isNotPresent = asyncResult[0] as bool?;
            if (asyncResult[1] is string error)
            {
                StdoutScript(searchScript);
                throw new ApplicationException("Error occured during BBSeeker search: '" + error + "'");
            }
            if (isNotPresent == false)
            {
                StdoutScript(searchScript);
                throw new TimeoutException("Timed out waiting for element to be removed: '" + bbSeekerSearchExpression + "'.");
            }
            if (isNotPresent == null)
            {
                StdoutScript(searchScript);
                throw new ApplicationException("Unexpected state occured in the async waitForElementNotPresent script, returned value is null."
                    + "This should not happen and might be a script author's error.");
            }

            return isNotPresent.Value;
        }

        private static void StdoutScript(string script)
        {
            Console.WriteLine("Debug script call:");
            Console.WriteLine(script
                .Replace("var doneCallback = arguments[arguments.length -1];", "var doneCallback = function(result) { console.log(result); };")
                .Replace("arguments[0]", "<searchRoot element>"));
            Console.WriteLine();
        }

        private static List<string> ConvertObjectCollectionToStringList(ReadOnlyCollection<object> input)
        {
            var result = new List<string>();
            foreach (var obj in input)
            {
                result.Add((string)obj);
            }
            return result;
        }

        private static T ToSingleOrDefaultSync<T>(IList<T> collection, string bbSeekerSearchExpression)
        {
            if (collection == null || collection.Count == 0)
            {
                return default(T);
            }
            if (collection.Count > 1)
            {
                throw new ApplicationException("Too many results returned for expression: \"" + bbSeekerSearchExpression + "\". Either narrow down the search or use method that returns whole collection.");
            }
            return collection[0];
        }

        private static T ToSingleAsync<T>(IList<T> collection, string bbSeekerSearchExpression)
        {
            if (collection.Count > 1)
            {
                throw new ApplicationException("Too many results returned for expression: \"" + bbSeekerSearchExpression + "\". Either narrow down the search or use method that returns whole collection.");
            }
            return collection[0];
        }

    }

}
